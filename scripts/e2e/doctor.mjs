#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertProductionGuard,
  commandExists,
  loadEnv,
  optionalEnv,
  parseArgs,
  projectRoot,
  spawnSyncCapture,
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

function hasCommand(name, versionArgs = ['--version']) {
  const ok = commandExists(name, versionArgs);
  check(name, ok, ok ? 'available' : 'missing from PATH');
  return ok;
}

try {
  assertProductionGuard(target);
  check('production guard', true, target === 'production' ? 'enabled' : `target=${target}`);
} catch (error) {
  check('production guard', false, error.message);
}

hasCommand('node');
hasCommand('npm');
hasCommand('java', ['-version']);
hasCommand('adb', ['version']);
hasCommand('emulator', ['-version']);
hasCommand('xcrun', ['--version']);

const maestroPath = optionalEnv('MAESTRO_BIN', `${process.env.HOME}/.maestro/bin/maestro`);
check('maestro', existsSync(maestroPath), maestroPath);

const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
check('ANDROID_HOME/ANDROID_SDK_ROOT', Boolean(androidHome), androidHome || 'not set');

const avdName = optionalEnv('E2E_ANDROID_AVD', 'UNIT_Pixel_8_API_36');
const avds = spawnSyncCapture('emulator', ['-list-avds']);
check(`Android AVD ${avdName}`, avds.output.split(/\r?\n/).includes(avdName), avds.output.trim() || 'no AVDs listed');

const adbDevices = spawnSyncCapture('adb', ['devices']);
const bootedAndroid = adbDevices.output
  .split(/\r?\n/)
  .some((line) => /\bdevice$/.test(line) && !line.startsWith('List of devices'));
check(
  'booted Android device',
  strictDevice ? bootedAndroid : true,
  bootedAndroid ? 'adb sees a device' : 'not booted; runner will start emulator when needed',
);

const iosDevice = optionalEnv('E2E_IOS_DEVICE', 'iPhone 16 Pro Max');
const sims = spawnSyncCapture('xcrun', ['simctl', 'list', 'devices']);
check(`iOS simulator ${iosDevice}`, sims.output.includes(iosDevice), sims.output.includes(iosDevice) ? 'configured' : 'not found');

check('unit/package.json', existsSync(join(unitDir, 'package.json')), join(unitDir, 'package.json'));
check('portal/package.json', existsSync(join(projectRoot, 'portal/package.json')), join(projectRoot, 'portal/package.json'));
check('iOS suite', existsSync(join(unitDir, 'maestro/flows/qa-00-full-suite-ios.yaml')), 'unit/maestro/flows/qa-00-full-suite-ios.yaml');
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
