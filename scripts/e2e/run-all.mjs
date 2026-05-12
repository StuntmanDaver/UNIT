#!/usr/bin/env node
import { existsSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
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

const summary = {
  runId,
  target,
  only,
  startedAt: new Date().toISOString(),
  results: [],
};

let metroProcess = null;
let androidProcess = null;

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
  const device = optionalEnv('E2E_IOS_DEVICE', 'iPhone 16 Pro Max');
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
      const result = await run(maestroBin(), ['test', '--platform', platform, '-e', `MAESTRO_APP_ID=${appId}`, flow], {
        cwd: unitDir,
        env: maestroEnv(appId),
        logPath,
        inherit: true,
      });
      status = result.status;
    }
    summary.results.push(resultRow(platform, name, attempts, status, logPath));
    writeJson(join(resultsDir, 'summary.json'), summary);
  }
}

function resultRow(platform, name, attempts, status, logPath) {
  return { platform, name, attempts, status, logPath };
}

function maestroBin() {
  return optionalEnv('MAESTRO_BIN', `${process.env.HOME}/.maestro/bin/maestro`);
}

function maestroEnv(appId) {
  return {
    ...productionVariantEnv(),
    MAESTRO_APP_ID: appId,
    MAESTRO_CLI_NO_ANALYTICS: '1',
    MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true',
    JAVA_HOME: optionalEnv('JAVA_HOME', '/opt/homebrew/opt/openjdk@21'),
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
