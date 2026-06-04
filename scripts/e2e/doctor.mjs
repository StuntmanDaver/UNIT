#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertProductionGuard,
  loadEnv,
  optionalEnv,
  parseArgs,
  projectRoot,
  run,
  unitDir,
} from './lib.mjs';

loadEnv();

const args = parseArgs();
const target = String(args.target || process.env.E2E_TARGET || 'local');
const json = Boolean(args.json);
const strictDevice = Boolean(args['strict-device']);

const checks = [];

function check(name, ok, detail = '') {
  checks.push({ name, ok, detail });
}

async function hasCommand(name, versionArgs = ['--version']) {
  const result = await run(name, versionArgs, { cwd: projectRoot, timeoutMs: 10000 });
  const ok = result.status === 0;
  check(name, ok, ok ? 'available' : result.status === 124 ? 'version probe timed out' : 'missing from PATH');
  return ok;
}

try {
  assertProductionGuard(target);
  check('production guard', true, target === 'production' ? 'enabled' : `target=${target}`);
} catch (error) {
  check('production guard', false, error.message);
}

await hasCommand('node');
await hasCommand('npm');
await hasCommand('java', ['-version']);
await hasCommand('adb', ['version']);
await hasCommand('emulator', ['-version']);
await hasCommand('xcrun', ['--version']);

const legacyMaestro = `${process.env.HOME}/.maestro/bin/maestro`;
const currentMaestro = `${process.env.HOME}/.maestro/maestro/bin/maestro`;
const maestroPath = optionalEnv('MAESTRO_BIN', existsSync(currentMaestro) ? currentMaestro : legacyMaestro);
check('maestro', existsSync(maestroPath), maestroPath);

const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
check('ANDROID_HOME/ANDROID_SDK_ROOT', Boolean(androidHome), androidHome || 'not set');

const avds = await run('emulator', ['-list-avds'], { cwd: projectRoot, timeoutMs: 15000 });
const avdList = avds.output.split(/\r?\n/).filter(Boolean);
const configuredAvdName = optionalEnv('E2E_ANDROID_AVD', 'UNIT_Pixel_8_API_35');
const avdName = resolveAvailableAndroidAvd(configuredAvdName, avdList);
check(
  `Android AVD ${avdName}`,
  avds.status !== 124 && avdList.includes(avdName),
  avds.status === 124
    ? 'emulator -list-avds timed out'
    : avdList.includes(avdName) && configuredAvdName !== avdName
    ? `configured ${configuredAvdName} missing; using ${avdName}`
    : avds.output.trim() || 'no AVDs listed',
);

const adbDevices = await run('adb', ['devices', '-l'], { cwd: projectRoot, timeoutMs: 15000 });
const bootedAndroid = adbDevices.output
  .split(/\r?\n/)
  .some((line) => /\bdevice\b/.test(line) && !line.startsWith('List of devices'));
check(
  'booted Android device',
  adbDevices.status === 124 ? false : strictDevice ? bootedAndroid : true,
  adbDevices.status === 124 ? 'adb devices timed out' : bootedAndroid ? 'adb sees a device' : 'not booted; runner will start emulator when needed',
);

const realAndroidRequired = process.env.E2E_REAL_ANDROID_REQUIRED === '1';
const realAndroidSerial = process.env.E2E_REAL_ANDROID_SERIAL || process.env.ANDROID_SERIAL || '';
const androidDeviceLines = adbDevices.output
  .split(/\r?\n/)
  .filter((line) => /\bdevice\b/.test(line) && !line.startsWith('List of devices'));
const realAndroid = androidDeviceLines.some((line) => {
  if (realAndroidSerial && line.startsWith(realAndroidSerial)) return true;
  return /\busb:/.test(line);
});
check(
  'real Android device',
  adbDevices.status === 124 ? false : realAndroidRequired ? realAndroid : true,
  adbDevices.status === 124 ? 'adb devices timed out' : realAndroid ? 'physical device detected' : realAndroidRequired ? 'required but not detected' : 'not required',
);

const sims = await run('xcrun', ['simctl', 'list', 'devices'], { cwd: projectRoot, timeoutMs: 30000 });
const requestedIosDevice = process.env.E2E_IOS_DEVICE;
const fallbackIosDevice = findAvailableIphoneSimulator(sims.output);
const iosDevice = optionalEnv('E2E_IOS_DEVICE', fallbackIosDevice || 'iPhone 17');
check(
  `iOS simulator ${iosDevice}`,
  sims.status !== 124 && sims.output.includes(iosDevice),
  sims.status === 124
    ? 'xcrun simctl list devices timed out'
    : sims.output.includes(iosDevice)
    ? (requestedIosDevice ? 'configured' : 'auto-detected')
    : 'not found',
);

check('unit/package.json', existsSync(join(unitDir, 'package.json')), join(unitDir, 'package.json'));
check('portal/package.json', existsSync(join(projectRoot, 'portal/package.json')), join(projectRoot, 'portal/package.json'));
const iosSuite = resolveIosSuite();
check('iOS suite', existsSync(join(unitDir, iosSuite)), `unit/${iosSuite}`);
check('Android suite', existsSync(join(unitDir, 'maestro/flows/qa-00-full-suite-android.yaml')), 'unit/maestro/flows/qa-00-full-suite-android.yaml');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
check('Supabase URL', Boolean(supabaseUrl), supabaseUrl || 'missing NEXT_PUBLIC_SUPABASE_URL/EXPO_PUBLIC_SUPABASE_URL');
check('SUPABASE_SERVICE_ROLE_KEY', Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), process.env.SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'missing');

const failed = checks.filter((item) => !item.ok);

if (json) {
  console.log(JSON.stringify({ ok: failed.length === 0, target, checks }, null, 2));
} else {
  console.log(`E2E doctor target=${target}`);
  for (const item of checks) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ` - ${item.detail}` : ''}`);
  }
}

process.exit(failed.length === 0 ? 0 : 1);

function findAvailableIphoneSimulator(output) {
  const match = output.match(/^\s+(iPhone[^(]+?)\s+\([0-9A-F-]+\)\s+\((?:Booted|Shutdown)\)/m);
  return match?.[1]?.trim() ?? '';
}

function resolveAvailableAndroidAvd(configuredName, avdList) {
  if (avdList.includes(configuredName)) return configuredName;
  if (avdList.includes('UNIT_Pixel_8_API_35')) return 'UNIT_Pixel_8_API_35';
  return configuredName;
}

function resolveIosSuite() {
  const defaultSuite = target === 'production' ? 'app-store' : 'full';
  const configuredSuite = optionalEnv('E2E_IOS_SUITE', defaultSuite);
  if (configuredSuite === 'full') return 'maestro/flows/qa-00-full-suite-ios.yaml';
  if (configuredSuite === 'app-store') return 'maestro/flows/qa-00-app-store-suite-ios.yaml';
  return configuredSuite;
}
