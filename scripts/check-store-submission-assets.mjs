#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = process.cwd();

const REQUIRED_IOS_SCREENSHOTS = [
  'colorway-tenant-home.png',
  'colorway-tenant-directory.png',
  'colorway-tenant-community.png',
  'colorway-tenant-promotions.png',
  'colorway-tenant-profile.png',
];

const REQUIRED_ANDROID_SCREENSHOTS = [
  'colorway-tenant-home.png',
  'colorway-tenant-directory.png',
  'colorway-tenant-community.png',
  'colorway-tenant-promotions.png',
  'colorway-tenant-pending-payment.png',
];

const REQUIRED_CONFIG = {
  iosBundleIdentifier: 'com.unitapp.mobile',
  androidPackage: 'com.unitapp.mobile',
  scheme: 'unit',
  version: '1.0.0',
};

function fail(message) {
  console.error(`store-submission-assets-failed: ${message}`);
  process.exitCode = 1;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readPngDimensions(path) {
  const buffer = readFileSync(path);
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    throw new Error('not a PNG file');
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function checkPng(path, predicate, expectation) {
  const absolutePath = resolve(projectRoot, path);
  if (!existsSync(absolutePath)) {
    fail(`missing ${path}`);
    return;
  }

  try {
    const dimensions = readPngDimensions(absolutePath);
    if (!predicate(dimensions)) {
      fail(`${path} is ${dimensions.width}x${dimensions.height}; expected ${expectation}`);
    }
  } catch (error) {
    fail(`${path} could not be inspected: ${error.message}`);
  }
}

function readProductionExpoConfig() {
  const output = execFileSync('npx', ['expo', 'config', '--json'], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      APP_VARIANT: 'production',
      EXPO_PUBLIC_ENV: 'production',
      EXPO_PUBLIC_APP_URL: 'unit://',
      EXPO_PUBLIC_SUPPORT_EMAIL: process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@unitapp.com',
    },
  });

  return JSON.parse(output);
}

const expoConfig = readProductionExpoConfig();
const easJson = readJson(resolve(projectRoot, 'eas.json'));

if (expoConfig.version !== REQUIRED_CONFIG.version) {
  fail(`production app version is ${expoConfig.version}; expected ${REQUIRED_CONFIG.version}`);
}

if (expoConfig.scheme !== REQUIRED_CONFIG.scheme) {
  fail(`production URL scheme is ${expoConfig.scheme}; expected ${REQUIRED_CONFIG.scheme}`);
}

if (expoConfig.ios?.bundleIdentifier !== REQUIRED_CONFIG.iosBundleIdentifier) {
  fail(`iOS bundle identifier is ${expoConfig.ios?.bundleIdentifier}; expected ${REQUIRED_CONFIG.iosBundleIdentifier}`);
}

if (expoConfig.android?.package !== REQUIRED_CONFIG.androidPackage) {
  fail(`Android package is ${expoConfig.android?.package}; expected ${REQUIRED_CONFIG.androidPackage}`);
}

if (expoConfig.ios?.infoPlist?.ITSAppUsesNonExemptEncryption !== false) {
  fail('iOS ITSAppUsesNonExemptEncryption must be false for the current release declaration');
}

for (const [name, value] of Object.entries({
  privacyPolicyUrl: expoConfig.extra?.privacyPolicyUrl,
  termsUrl: expoConfig.extra?.termsUrl,
  accountDeletionUrl: expoConfig.extra?.accountDeletionUrl,
})) {
  if (typeof value !== 'string' || !value.startsWith('https://')) {
    fail(`extra.${name} must be an https URL`);
  }
}

if (!existsSync(resolve(projectRoot, 'ios/UNIT/PrivacyInfo.xcprivacy'))) {
  fail('missing iOS privacy manifest at ios/UNIT/PrivacyInfo.xcprivacy');
}

if (easJson.submit?.production?.ios?.ascAppId !== '6767079612') {
  fail('eas submit.production.ios.ascAppId must be 6767079612');
}

if (easJson.submit?.production?.android?.track !== 'internal') {
  fail('eas submit.production.android.track must remain internal until release-owner promotion approval');
}

checkPng('assets/icon.png', ({ width, height }) => width === 1024 && height === 1024, '1024x1024');
checkPng('assets/adaptive-icon.png', ({ width, height }) => width === 1024 && height === 1024, '1024x1024');

for (const screenshot of REQUIRED_IOS_SCREENSHOTS) {
  checkPng(
    screenshot,
    ({ width, height }) => width >= 1242 && height >= 2208 && height > width,
    'portrait iPhone screenshot at least 1242x2208'
  );
}

for (const screenshot of REQUIRED_ANDROID_SCREENSHOTS) {
  checkPng(
    screenshot,
    ({ width, height }) => width >= 1080 && height >= 1920 && height > width,
    'portrait Android phone screenshot at least 1080x1920'
  );
}

if (process.exitCode) {
  process.exit();
}

console.log('store-submission-assets-ok: production config, icons, privacy manifest, submit targets, and screenshot assets are ready');
