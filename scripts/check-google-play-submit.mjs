#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = process.cwd();
const easJsonPath = resolve(projectRoot, 'eas.json');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function fail(message) {
  console.error(`google-play-preflight: ${message}`);
  process.exitCode = 1;
}

function checkCommand(command, args) {
  try {
    return execFileSync(command, args, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

function readExpoConfig() {
  const output = execFileSync('npx', ['expo', 'config', '--json'], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      APP_VARIANT: process.env.APP_VARIANT ?? 'production',
      EXPO_PUBLIC_ENV: process.env.EXPO_PUBLIC_ENV ?? 'production',
    },
  });

  return JSON.parse(output);
}

const expoConfig = readExpoConfig();
const easJson = readJson(easJsonPath);
const androidPackage = expoConfig.android?.package;
const submitConfig = easJson.submit?.production?.android;
const serviceAccountKeyPath = submitConfig?.serviceAccountKeyPath;

if (!androidPackage) {
  fail('missing android.package in the resolved Expo config');
}

if (!serviceAccountKeyPath) {
  fail('missing submit.production.android.serviceAccountKeyPath in eas.json');
}

const resolvedKeyPath = serviceAccountKeyPath
  ? resolve(projectRoot, serviceAccountKeyPath)
  : null;

if (resolvedKeyPath && !existsSync(resolvedKeyPath)) {
  fail(`missing Google Play service account key at ${serviceAccountKeyPath}`);
}

if (resolvedKeyPath && existsSync(resolvedKeyPath)) {
  try {
    const key = readJson(resolvedKeyPath);
    if (key.type !== 'service_account') {
      fail(`${serviceAccountKeyPath} is not a Google service account JSON key`);
    }
    if (!key.client_email || !key.private_key) {
      fail(`${serviceAccountKeyPath} is missing client_email or private_key`);
    }
  } catch {
    fail(`${serviceAccountKeyPath} is not valid JSON`);
  }
}

const easUser = checkCommand('eas', ['whoami']);
if (!easUser) {
  fail('EAS CLI is not installed or you are not logged in; run `eas login`');
}

if (!checkCommand('eas', ['build:list', '--platform', 'android', '--limit', '1', '--json'])) {
  fail('EAS could not read Android builds for this project');
}

if (process.exitCode) {
  process.exit();
}

console.log(`google-play-preflight: ready for ${androidPackage}`);
console.log(`google-play-preflight: EAS account ${easUser.split('\n')[0]}`);
console.log(`google-play-preflight: submit track ${submitConfig.track ?? 'internal'}`);
