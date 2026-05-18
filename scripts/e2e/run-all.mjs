#!/usr/bin/env node
import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  assertRemoteWriteGuard,
  createRunId,
  ensureDir,
  loadEnv,
  optionalEnv,
  parseArgs,
  parseSuiteFlows,
  projectRoot,
  resultsRoot,
  run,
  spawnLongRunning,
  unitDir,
  portalDir,
  waitForPort,
  writeJson,
} from './lib.mjs';

loadEnv();

const args = parseArgs();
const only = String(args.only || process.env.E2E_ONLY || 'all');
const target = String(args.target || process.env.E2E_TARGET || 'local');
const runId = String(args['run-id'] || process.env.E2E_RUN_ID || createRunId());
const resultsDir = ensureDir(join(resultsRoot, runId));
const shouldSeed = process.env.E2E_SKIP_SEED !== '1';
const shouldStartMetro = process.env.E2E_START_METRO !== '0';
const shouldBuildMissing = process.env.E2E_BUILD_MISSING === '1';
const shouldAvoidAndroidMaestroClearState = process.env.E2E_ANDROID_AVOID_MAESTRO_CLEAR_STATE !== '0';
const shouldUseIosDevClientUrl = process.env.E2E_IOS_USE_DEV_CLIENT_URL !== '0' && shouldStartMetro;

const summary = {
  runId,
  target,
  only,
  startedAt: new Date().toISOString(),
  results: [],
};

let metroProcess = null;
let androidProcess = null;
let androidMaestroDriverProcess = null;

async function main() {
  assertRemoteWriteGuard(target);
  console.log(`UNIT E2E run ${runId} target=${target} only=${only}`);

  const doctor = await run('node', [join(unitDir, 'scripts/e2e/doctor.mjs'), '--target', target], {
    cwd: projectRoot,
    logPath: join(resultsDir, 'doctor.log'),
    inherit: true,
  });
  if (doctor.status !== 0 && process.env.E2E_SKIP_DOCTOR_FAILURE !== '1') {
    throw new Error(`Doctor failed. See ${join(resultsDir, 'doctor.log')}`);
  }

  if (shouldSeed) {
    const seed = await run('node', [join(unitDir, 'scripts/e2e/seed.mjs'), '--target', target, '--run-id', runId], {
      cwd: projectRoot,
      logPath: join(resultsDir, 'seed.log'),
      inherit: true,
    });
    summary.results.push(resultRow('seed', 'production-safe QA seed', 1, seed.status, join(resultsDir, 'seed.log')));
    if (seed.status !== 0) throw new Error(`Seed failed. See ${join(resultsDir, 'seed.log')}`);
  }

  if (needsMobile(only) && shouldStartMetro) {
    metroProcess = await startMetro();
  }

  if (only === 'all' || only === 'mobile' || only === 'ios') {
    await runIos();
  }

  if (only === 'all' || only === 'mobile' || only === 'android') {
    await runAndroid();
  }

  if (only === 'all' || only === 'portal') {
    await runPortal();
  }

  summary.finishedAt = new Date().toISOString();
  writeJson(join(resultsDir, 'summary.json'), summary);
  await run('node', [join(unitDir, 'scripts/e2e/report.mjs'), '--run-id', runId], { cwd: projectRoot, inherit: true });

  const failed = summary.results.filter((result) => result.status !== 0);
  console.log(`E2E complete: ${summary.results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length > 0) process.exit(1);
}

async function startMetro() {
  const logPath = join(resultsDir, 'metro.log');
  const alreadyRunning = await portOpen(8081);
  if (alreadyRunning) {
    console.log('Metro already appears to be running on port 8081');
    return null;
  }

  console.log('Starting Metro on port 8081');
  const child = spawnLongRunning('npx', ['expo', 'start', '--localhost', '--port', '8081'], {
    cwd: unitDir,
    logPath,
    env: productionVariantEnv(),
  });
  await waitForPort(8081, '127.0.0.1', 90000);
  return child;
}

async function runIos() {
  const device = optionalEnv('E2E_IOS_DEVICE', 'iPhone 17');
  const bundleId = optionalEnv('E2E_IOS_BUNDLE_ID', target === 'staging' ? 'com.unitapp.mobile.staging' : 'com.unitapp.mobile');
  const suite = join(unitDir, 'maestro/flows/qa-00-full-suite-ios.yaml');
  await run('xcrun', ['simctl', 'boot', device], { cwd: projectRoot, logPath: join(resultsDir, 'ios-boot.log') });
  await run('xcrun', ['simctl', 'bootstatus', device, '-b'], { cwd: projectRoot, logPath: join(resultsDir, 'ios-bootstatus.log'), inherit: true });

  const appCheck = await run('xcrun', ['simctl', 'get_app_container', 'booted', bundleId], {
    cwd: projectRoot,
    logPath: join(resultsDir, 'ios-app-check.log'),
  });
  if (appCheck.status !== 0) {
    if (!shouldBuildMissing) {
      summary.results.push(resultRow('ios', 'app installed', 1, 1, join(resultsDir, 'ios-app-check.log')));
      console.log(`iOS app ${bundleId} is not installed. Set E2E_BUILD_MISSING=1 to run expo run:ios automatically.`);
      return;
    }
    const build = await run('npx', ['expo', 'run:ios', '--device', device], {
      cwd: unitDir,
      env: productionVariantEnv(),
      logPath: join(resultsDir, 'ios-build-install.log'),
      inherit: true,
    });
    summary.results.push(resultRow('ios', 'build/install app', 1, build.status, join(resultsDir, 'ios-build-install.log')));
    if (build.status !== 0) return;
  }

  await runMaestroSuite('ios', suite, bundleId);
}

async function runAndroid() {
  const avd = optionalEnv('E2E_ANDROID_AVD', 'UNIT_Pixel_8_API_36');
  const packageId = optionalEnv('MAESTRO_APP_ID', target === 'staging' ? 'com.unitapp.mobile.staging' : 'com.unitapp.mobile');
  const suite = join(unitDir, 'maestro/flows/qa-00-full-suite-android.yaml');
  const devicesBefore = await run('adb', ['devices'], { cwd: projectRoot, logPath: join(resultsDir, 'android-devices-before.log') });
  if (!/\bdevice$/m.test(devicesBefore.output.replace(/^List of devices attached.*$/m, ''))) {
    console.log(`Starting Android emulator ${avd}`);
    androidProcess = spawnLongRunning('emulator', ['-avd', avd, '-no-snapshot-load'], {
      cwd: projectRoot,
      logPath: join(resultsDir, 'android-emulator.log'),
    });
  }
  await run('adb', ['wait-for-device'], { cwd: projectRoot, logPath: join(resultsDir, 'android-wait.log'), inherit: true });
  await waitForAndroidBoot();

  const appCheck = await run('adb', ['shell', 'pm', 'path', packageId], {
    cwd: projectRoot,
    logPath: join(resultsDir, 'android-app-check.log'),
  });
  if (appCheck.status !== 0 || !appCheck.output.includes('package:')) {
    if (!shouldBuildMissing) {
      summary.results.push(resultRow('android', 'app installed', 1, 1, join(resultsDir, 'android-app-check.log')));
      console.log(`Android app ${packageId} is not installed. Set E2E_BUILD_MISSING=1 to run expo run:android automatically.`);
      return;
    }
    const build = await run('npm', ['run', 'android'], {
      cwd: unitDir,
      env: productionVariantEnv(),
      logPath: join(resultsDir, 'android-build-install.log'),
      inherit: true,
    });
    summary.results.push(resultRow('android', 'build/install app', 1, build.status, join(resultsDir, 'android-build-install.log')));
    if (build.status !== 0) return;
  }

  await bootstrapAndroidMaestroDriver(packageId);
  await runMaestroSuite('android', suite, packageId);
}

async function runPortal() {
  const logPath = join(resultsDir, 'portal-playwright.log');
  const result = await run('npm', ['run', 'test:e2e'], {
    cwd: portalDir,
    logPath,
    inherit: true,
    env: { RUN_FULL_E2E: process.env.RUN_FULL_E2E || '1' },
  });
  summary.results.push(resultRow('portal', 'playwright e2e', 1, result.status, logPath));
}

async function runMaestroSuite(platform, suitePath, appId) {
  if (!existsSync(suitePath)) {
    summary.results.push(resultRow(platform, basename(suitePath), 1, 1, suitePath));
    return;
  }
  const flows = parseSuiteFlows(suitePath);
  if (flows.length === 0) {
    summary.results.push(resultRow(platform, basename(suitePath), 1, 1, suitePath));
    return;
  }

  for (const flow of flows) {
    const name = basename(flow);
    let attempts = 0;
    let status = 1;
    let logPath = '';
    while (attempts < 2 && status !== 0) {
      attempts += 1;
      logPath = join(resultsDir, platform, `${name.replace(/\.ya?ml$/, '')}-attempt-${attempts}.log`);
      const prepared = await prepareMaestroFlow(platform, flow, appId, attempts, logPath);
      try {
        if (platform === 'android' && shouldAvoidAndroidMaestroClearState) {
          await startAndroidMaestroDriver(`${logPath.replace(/\.log$/, '')}-maestro-driver`);
        }
        const result = await run(maestroBin(), maestroTestArgs(platform, appId, prepared.flowPath), {
          cwd: unitDir,
          env: maestroEnv(appId),
          logPath,
          inherit: true,
          timeoutMs: Number(optionalEnv('E2E_MAESTRO_FLOW_TIMEOUT_MS', '900000')),
        });
        status = result.status;
      } finally {
        prepared.cleanup();
      }
    }
    summary.results.push(resultRow(platform, name, attempts, status, logPath));
    writeJson(join(resultsDir, 'summary.json'), summary);
  }
}

async function bootstrapAndroidMaestroDriver(appId) {
  const logPrefix = join(resultsDir, 'android-maestro-driver');
  const tmp = mkdtempSync(join(tmpdir(), 'unit-maestro-driver-'));

  try {
    await releaseAndroidMaestroPort(logPrefix);
    await run('jar', ['xf', join(dirname(dirname(maestroBin())), 'lib/maestro-client.jar'), 'maestro-app.apk', 'maestro-server.apk'], {
      cwd: tmp,
      logPath: `${logPrefix}-extract.log`,
      timeoutMs: 10000,
    });
    await run('adb', ['install', '-r', join(tmp, 'maestro-app.apk')], {
      cwd: projectRoot,
      logPath: `${logPrefix}-install-app.log`,
      inherit: true,
      timeoutMs: 30000,
    });
    await run('adb', ['install', '-r', join(tmp, 'maestro-server.apk')], {
      cwd: projectRoot,
      logPath: `${logPrefix}-install-server.log`,
      inherit: true,
      timeoutMs: 30000,
    });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  await run('adb', ['forward', 'tcp:7001', 'tcp:7001'], {
    cwd: projectRoot,
    logPath: `${logPrefix}-adb-forward.log`,
    inherit: true,
    timeoutMs: 10000,
  });
}

async function startAndroidMaestroDriver(logPrefix) {
  if (androidMaestroDriverProcess) {
    androidMaestroDriverProcess.kill();
    androidMaestroDriverProcess = null;
  }
  await run('adb', ['shell', 'am', 'force-stop', 'dev.mobile.maestro'], {
    cwd: projectRoot,
    logPath: `${logPrefix}-force-stop-app.log`,
    timeoutMs: 5000,
  });
  await releaseAndroidMaestroPort(logPrefix);
  await run('adb', ['forward', 'tcp:7001', 'tcp:7001'], {
    cwd: projectRoot,
    logPath: `${logPrefix}-adb-forward.log`,
    timeoutMs: 10000,
  });
  androidMaestroDriverProcess = spawnLongRunning(
    'adb',
    ['shell', 'am', 'instrument', '-w', 'dev.mobile.maestro.test/androidx.test.runner.AndroidJUnitRunner'],
    {
      cwd: projectRoot,
      logPath: `${logPrefix}-instrumentation.log`,
    }
  );
  await waitForAndroidMaestroServer(logPrefix);
}

async function waitForAndroidMaestroServer(logPrefix) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    const result = await run('adb', ['shell', 'ss', '-ltn'], {
      cwd: projectRoot,
      logPath: `${logPrefix}-ss.log`,
      timeoutMs: 5000,
    });
    if (result.output.includes(':7001')) {
      await waitForPort(7001, '127.0.0.1', 5000);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('Timed out waiting for Android Maestro driver on device port 7001');
}

async function releaseAndroidMaestroPort(logPrefix) {
  await run('adb', ['forward', '--remove-all'], {
    cwd: projectRoot,
    logPath: `${logPrefix}-adb-forward-remove-all.log`,
    timeoutMs: 5000,
  });

  const listeners = await run('lsof', ['-nP', '-iTCP:7001', '-sTCP:LISTEN'], {
    cwd: projectRoot,
    logPath: `${logPrefix}-port-listeners.log`,
    timeoutMs: 5000,
  });
  const maestroListenerPids = listeners.output
    .split(/\r?\n/)
    .filter((line) => /\bmaestro-d\b/.test(line))
    .map((line) => line.trim().split(/\s+/)[1])
    .filter(Boolean);
  if (maestroListenerPids.length > 0) {
    await run('kill', maestroListenerPids, {
      cwd: projectRoot,
      logPath: `${logPrefix}-kill-stale-listeners.log`,
      timeoutMs: 5000,
    });
  }
}

async function prepareMaestroFlow(platform, flow, appId, attempt, logPath) {
  if (platform === 'ios') {
    if (shouldUseIosDevClientUrl) {
      await launchIosDevClient(appId, logPath);
    }

    const tempFlow = join(dirname(flow), `.ios-stable-${process.pid}-${attempt}-${basename(flow)}`);
    const rawContents = removeIosDevLauncherUrlTaps(readFileSync(flow, 'utf8'));
    const startupContents = shouldUseIosDevClientUrl
      ? replaceIosSessionRestoreLaunches(removeInitialLaunchApp(rawContents))
      : rawContents;
    let contents = insertIosOpenConfirmation(stabilizeIosStartupPrompts(startupContents))
      .replace(/^[ \t]*- tapOn:\n[ \t]+text:\s*"(?:Continue|Close)"\n[ \t]+optional:\s*true\n/gm, '');
    if (shouldUseIosDevClientUrl) {
      contents = contents.replace(/^(\s*)clearState:\s*true\s*$/gm, '$1clearState: false');
    }
    writeFileSync(tempFlow, contents);

    return {
      flowPath: tempFlow,
      cleanup: () => {
        try {
          unlinkSync(tempFlow);
        } catch {
          // Best-effort cleanup; a failed test should keep the original error.
        }
      },
    };
  }

  if (platform !== 'android' || !shouldAvoidAndroidMaestroClearState) {
    return { flowPath: flow, cleanup: () => {} };
  }

  await launchAndroidDevClient(appId, logPath);

  const tempFlow = join(dirname(flow), `.android-no-clear-${process.pid}-${attempt}-${basename(flow)}`);
  const contents = stabilizeAndroidStartupPrompts(
    replaceAndroidSessionRestoreLaunches(
      removeAndroidDevLauncherUrlTaps(removeInitialLaunchApp(readFileSync(flow, 'utf8')))
    )
  )
    .replace(/^[ \t]*- tapOn:\n[ \t]+text:\s*"(?:Continue|Close)"\n[ \t]+optional:\s*true\n/gm, '')
    .replace(/^[ \t]*- waitForAnimationToEnd\s*\n/gm, '')
    .replace(/^(\s*)clearState:\s*true\s*$/gm, '$1clearState: false')
    .replace(/text:\s*"http:\/\/10\.0\.2\.2:8081"/g, 'text: ".*8081"');
  writeFileSync(tempFlow, contents);

  return {
    flowPath: tempFlow,
    cleanup: () => {
      try {
        unlinkSync(tempFlow);
      } catch {
        // Best-effort cleanup; a failed test should keep the original error.
      }
    },
  };
}

async function launchIosDevClient(appId, logPath) {
  const prefix = logPath.replace(/\.log$/, '');
  const devClientUrl = iosDevClientUrl();

  await run('xcrun', ['simctl', 'terminate', 'booted', appId], {
    cwd: projectRoot,
    logPath: `${prefix}-terminate.log`,
    timeoutMs: 10000,
  });
  await run('xcrun', ['simctl', 'openurl', 'booted', devClientUrl], {
    cwd: projectRoot,
    logPath: `${prefix}-dev-client-launch.log`,
    inherit: true,
    timeoutMs: 20000,
  });
  await new Promise((resolve) => setTimeout(resolve, Number(optionalEnv('E2E_IOS_DEV_CLIENT_SETTLE_MS', '25000'))));
}

async function launchAndroidDevClient(appId, logPath) {
  const prefix = logPath.replace(/\.log$/, '');
  const devClientUrl = androidDevClientUrl();

  // Force-stop Chrome before each flow to prevent its first-run dialog or link
  // interception from stealing foreground focus away from the UNIT dev client.
  await run('adb', ['shell', 'am', 'force-stop', 'com.android.chrome'], {
    cwd: projectRoot,
    logPath: `${prefix}-force-stop-chrome.log`,
    timeoutMs: 5000,
  });
  await run('adb', ['shell', 'am', 'force-stop', appId], {
    cwd: projectRoot,
    logPath: `${prefix}-force-stop.log`,
    inherit: true,
    timeoutMs: 15000,
  });
  await run('adb', ['shell', 'pm', 'clear', appId], {
    cwd: projectRoot,
    logPath: `${prefix}-pm-clear.log`,
    inherit: true,
    timeoutMs: 20000,
  });
  await run(
    'adb',
    ['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', devClientUrl, appId],
    {
      cwd: projectRoot,
      logPath: `${prefix}-dev-client-launch.log`,
      inherit: true,
      timeoutMs: 20000,
    }
  );
  await new Promise((resolve) => setTimeout(resolve, 25000));
  await settleAndroidStartupOverlays(appId, devClientUrl, prefix);
  // Restore ADB port forwarding. Maestro removes it when its process exits after each flow,
  // so reconnecting before the next flow prevents gRPC Connection refused on port 7001.
  await run('adb', ['forward', 'tcp:7001', 'tcp:7001'], {
    cwd: projectRoot,
    logPath: `${prefix}-adb-forward.log`,
    timeoutMs: 5000,
  });
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

async function settleAndroidStartupOverlays(appId, devClientUrl, prefix) {
  for (let pass = 1; pass <= 10; pass += 1) {
    const focus = await ensureAndroidAppForeground(appId, devClientUrl, prefix, pass);
    if (/Application Not Responding|aerr_/.test(focus)) {
      await tapAndroid('anr-wait', '540', '1395', `${prefix}-startup-${pass}`);
      continue;
    }

    const hierarchy = await androidHierarchy(`${prefix}-startup-${pass}-hierarchy.log`);
    if (/Command timed out/.test(hierarchy)) {
      await tapAndroid('hierarchy-timeout-wait', '540', '1395', `${prefix}-startup-${pass}`);
      continue;
    }

    if (/Process system isn.?t responding/.test(hierarchy)) {
      await tapAndroid('anr-wait', '540', '1395', `${prefix}-startup-${pass}`);
      continue;
    }

    if (/text="Continue"/.test(hierarchy) && /developer menu|development builds|Runtime version/.test(hierarchy)) {
      await tapAndroid('dev-intro-continue', '540', '2246', `${prefix}-startup-${pass}`);
      continue;
    }

    if (/Connected to:|Performance monitor|Element inspector|JS debugger|Fast Refresh/.test(hierarchy)) {
      await tapAndroid('dev-menu-close', '970', '244', `${prefix}-startup-${pass}`);
      continue;
    }

    if (/text="Log In"|resource-id="login-email"|resource-id=[^;"]*login-email/.test(hierarchy)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
}

async function ensureAndroidAppForeground(appId, devClientUrl, prefix, pass) {
  const focus = await run('adb', ['shell', 'dumpsys', 'window'], {
    cwd: projectRoot,
    logPath: `${prefix}-startup-${pass}-focus.log`,
    timeoutMs: 8000,
  });
  if (focus.output.includes(appId)) return focus.output;

  await run(
    'adb',
    ['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', devClientUrl, appId],
    {
      cwd: projectRoot,
      logPath: `${prefix}-startup-${pass}-relaunch.log`,
      timeoutMs: 20000,
    }
  );
  await new Promise((resolve) => setTimeout(resolve, 8000));
  const relaunchedFocus = await run('adb', ['shell', 'dumpsys', 'window'], {
    cwd: projectRoot,
    logPath: `${prefix}-startup-${pass}-focus-after-relaunch.log`,
    timeoutMs: 8000,
  });
  return relaunchedFocus.output;
}

async function androidHierarchy(logPath) {
  const result = await run('adb', ['shell', 'uiautomator', 'dump', '/dev/tty'], {
    cwd: projectRoot,
    timeoutMs: 10000,
  });
  writeFileSync(logPath, result.output);
  return result.output;
}

async function tapAndroid(name, x, y, prefix) {
  await run('adb', ['shell', 'input', 'tap', x, y], {
    cwd: projectRoot,
    logPath: `${prefix}-${name}.log`,
    timeoutMs: 5000,
  });
  await new Promise((resolve) => setTimeout(resolve, 2500));
}

function androidDevClientUrl() {
  const metroUrl = optionalEnv('E2E_ANDROID_METRO_URL', 'http://10.0.2.2:8081');
  const scheme = optionalEnv('E2E_ANDROID_DEV_CLIENT_SCHEME', target === 'staging' ? 'unit-staging' : 'unit');
  return optionalEnv(
    'E2E_ANDROID_DEV_CLIENT_URL',
    `${scheme}://expo-development-client/?url=${encodeURIComponent(metroUrl)}`
  );
}

function iosDevClientUrl() {
  const metroUrl = optionalEnv('E2E_IOS_METRO_URL', 'http://127.0.0.1:8081');
  const scheme = optionalEnv('E2E_IOS_DEV_CLIENT_SCHEME', target === 'staging' ? 'unit-staging' : 'unit');
  return optionalEnv(
    'E2E_IOS_DEV_CLIENT_URL',
    `${scheme}://expo-development-client/?url=${encodeURIComponent(metroUrl)}`
  );
}

function removeInitialLaunchApp(contents) {
  return contents.replace(
    /(^---\n(?:#[^\n]*\n|\s*\n)*)- launchApp:\n(?:[ \t]+[^\n]*\n)*/m,
    '$1'
  );
}

function removeAndroidDevLauncherUrlTaps(contents) {
  return contents.replace(
    /- tapOn:\n[ \t]+text:\s*"http:\/\/10\.0\.2\.2:8081"\n[ \t]+optional:\s*true\n- waitForAnimationToEnd\n/g,
    ''
  );
}

function removeIosDevLauncherUrlTaps(contents) {
  return contents
    .replace(
      /- runFlow:\n[ \t]+when:\n[ \t]+visible:\s*"Development Build"\n[ \t]+commands:\n(?:[ \t]+-[^\n]*\n|[ \t]+[^\n]*\n)*/g,
      ''
    )
    .replace(
      /- runFlow:\n[ \t]+when:\n[ \t]+visible:\s*"\.\*8081"\n[ \t]+commands:\n(?:[ \t]+-[^\n]*\n|[ \t]+[^\n]*\n)*/g,
      ''
    );
}

function replaceAndroidSessionRestoreLaunches(contents) {
  return contents.replace(
    /- launchApp:\n[ \t]+clearState:\s*false\s*\n/g,
    `- openLink: ${JSON.stringify(androidAppUrl())}\n`
  );
}

function replaceIosSessionRestoreLaunches(contents) {
  return contents.replace(
    /- launchApp:\n[ \t]+clearState:\s*(?:true|false)\s*\n/g,
    `- openLink: ${JSON.stringify(iosAppUrl())}\n`
  );
}

function androidAppUrl() {
  const scheme = optionalEnv('E2E_ANDROID_DEV_CLIENT_SCHEME', target === 'staging' ? 'unit-staging' : 'unit');
  return optionalEnv('E2E_ANDROID_APP_URL', `${scheme}://`);
}

function iosAppUrl() {
  const scheme = optionalEnv('E2E_IOS_DEV_CLIENT_SCHEME', target === 'staging' ? 'unit-staging' : 'unit');
  return optionalEnv('E2E_IOS_APP_URL', `${scheme}://`);
}

function stabilizeAndroidStartupPrompts(contents) {
  return contents
    .replace(
      /- tapOn:\s*"Continue"\n([ \t]*)- waitForAnimationToEnd\n\1- tapOn:\s*"Close"\n\1- waitForAnimationToEnd/g,
      '- tapOn: "Continue"\n$1- extendedWaitUntil:\n$1    visible:\n$1      text: "Close"\n$1    timeout: 8000\n$1- tapOn: "Close"'
    )
    .replace(/- tapOn:\s*"Allow"\n([ \t]*)- waitForAnimationToEnd/g, '- tapOn: "Allow"');
}

function stabilizeIosStartupPrompts(contents) {
  return contents
    .replace(
      /- tapOn:\s*"Continue"\n([ \t]*)- waitForAnimationToEnd\n\1- tapOn:\s*"Close"\n\1- waitForAnimationToEnd/g,
      '- tapOn: "Continue"\n$1- extendedWaitUntil:\n$1    visible:\n$1      text: "Close"\n$1    timeout: 8000\n$1- tapOn: "Close"'
    )
    .replace(/- tapOn:\s*"Allow"\n([ \t]*)- waitForAnimationToEnd/g, '- tapOn: "Allow"');
}

function insertIosOpenConfirmation(contents) {
  const commands = `# Accept the simulator's first-open confirmation for UNIT links.
- runFlow:
    when:
      visible: "Open in.*UNIT"
    commands:
      - waitForAnimationToEnd
      - tapOn:
          point: "68%,54%"
      - waitForAnimationToEnd
- runFlow:
    when:
      visible: "Open"
    commands:
      - waitForAnimationToEnd
      - tapOn:
          point: "68%,54%"
      - waitForAnimationToEnd
      - tapOn:
          point: "68%,54%"
      - waitForAnimationToEnd

`;
  if (/- launchApp:\n(?:[ \t]+[^\n]*\n)*/.test(contents)) {
    return contents.replace(/(- launchApp:\n(?:[ \t]+[^\n]*\n)*)/, `$1\n${commands}`);
  }
  return contents.replace(/(appId:[^\n]*\n---\n)/, `$1${commands}`);
}

function maestroTestArgs(platform, appId, flowPath) {
  const args = ['test', '--platform', platform, '-e', `MAESTRO_APP_ID=${appId}`];
  if (platform === 'android' && shouldAvoidAndroidMaestroClearState) {
    args.push('--no-reinstall-driver');
  }
  args.push(
    '--debug-output',
    ensureDir(join(resultsDir, 'maestro-debug', `${platform}-${basename(flowPath).replace(/\.ya?ml$/, '')}`)),
    '--flatten-debug-output'
  );
  args.push(flowPath);
  return args;
}

function resultRow(platform, name, attempts, status, logPath) {
  return { platform, name, attempts, status, logPath };
}

function maestroBin() {
  // Maestro 2.x moved from ~/.maestro/bin/maestro to ~/.maestro/maestro/bin/maestro.
  const legacy = `${process.env.HOME}/.maestro/bin/maestro`;
  const current = `${process.env.HOME}/.maestro/maestro/bin/maestro`;
  const defaultBin = existsSync(current) ? current : legacy;
  return optionalEnv('MAESTRO_BIN', defaultBin);
}

function maestroEnv(appId) {
  const javaToolOptions = optionalEnv('JAVA_TOOL_OPTIONS', '');
  return {
    ...productionVariantEnv(),
    MAESTRO_APP_ID: appId,
    MAESTRO_CLI_NO_ANALYTICS: '1',
    MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true',
    JAVA_HOME: optionalEnv('JAVA_HOME', '/opt/homebrew/opt/openjdk@21'),
    JAVA_TOOL_OPTIONS: `${javaToolOptions} -Djava.net.preferIPv4Stack=true`.trim(),
  };
}

function productionVariantEnv() {
  if (target === 'staging') {
    return { APP_VARIANT: 'staging', EXPO_PUBLIC_ENV: 'staging', EXPO_PUBLIC_APP_URL: 'unit-staging://' };
  }
  if (target === 'production') {
    return { APP_VARIANT: 'production', EXPO_PUBLIC_ENV: 'production', EXPO_PUBLIC_APP_URL: 'unit://' };
  }
  return {};
}

async function portOpen(port) {
  try {
    await waitForPort(port, '127.0.0.1', 250);
    return true;
  } catch {
    return false;
  }
}

async function waitForAndroidBoot() {
  const startedAt = Date.now();
  const logPath = join(resultsDir, 'android-bootstatus.log');
  while (Date.now() - startedAt < 120000) {
    const result = await run('adb', ['shell', 'getprop', 'sys.boot_completed'], { cwd: projectRoot });
    if (result.output.trim() === '1') {
      writeFileSync(logPath, 'Android boot completed\n');
      // Wait for system services and launcher to finish initializing after boot flag is set.
      await new Promise((resolve) => setTimeout(resolve, 15000));
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  writeFileSync(logPath, 'Timed out waiting for Android boot\n');
  throw new Error('Timed out waiting for Android boot');
}

function needsMobile(value) {
  return value === 'all' || value === 'mobile' || value === 'ios' || value === 'android';
}

process.on('exit', () => {
  if (metroProcess) metroProcess.kill();
  if (androidProcess && process.env.E2E_KEEP_ANDROID_EMULATOR !== '1') androidProcess.kill();
  if (androidMaestroDriverProcess) androidMaestroDriverProcess.kill();
});

main().catch(async (error) => {
  summary.finishedAt = new Date().toISOString();
  summary.error = error instanceof Error ? error.message : String(error);
  writeJson(join(resultsDir, 'summary.json'), summary);
  writeFileSync(join(resultsDir, 'error.txt'), `${summary.error}\n`);
  await run('node', ['scripts/e2e/report.mjs', '--run-id', runId], { cwd: projectRoot });
  console.error(summary.error);
  process.exit(1);
});
