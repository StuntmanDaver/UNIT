#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = process.cwd();
const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? run('gcloud', [
  'config',
  'get-value',
  'project',
]).trim();
const serviceAccountName = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT ?? 'unit-play-publisher';
const keyPath = resolve(projectRoot, process.env.GOOGLE_PLAY_KEY_PATH ?? 'google-play-key.json');
const serviceAccountEmail = `${serviceAccountName}@${projectId}.iam.gserviceaccount.com`;

function run(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    if (options.allowFailure) {
      return null;
    }

    const stderr = String(error.stderr ?? '');
    const stdout = String(error.stdout ?? '');
    const details = `${stderr}${stdout}`.trim();
    throw new Error(details || `${command} ${args.join(' ')} failed`);
  }
}

function canDescribeServiceAccount() {
  try {
    run('gcloud', [
      'iam',
      'service-accounts',
      'describe',
      serviceAccountEmail,
      '--project',
      projectId,
    ]);
    return true;
  } catch {
    return false;
  }
}

if (!projectId || projectId === '(unset)') {
  console.error('Set a Google Cloud project with `gcloud config set project PROJECT_ID`.');
  process.exit(1);
}

try {
  run('gcloud', [
    'services',
    'enable',
    'androidpublisher.googleapis.com',
    '--project',
    projectId,
  ], { stdio: 'inherit' });
} catch (error) {
  console.error(`Could not enable Android Publisher API for project "${projectId}".`);
  console.error('');
  console.error('Use a real Google Cloud project ID, not the Play Console app name.');
  console.error('You can list visible project IDs with:');
  console.error('');
  console.error('  gcloud projects list --format="table(projectId,name)"');
  console.error('');
  console.error('Then either set one explicitly:');
  console.error('');
  console.error('  gcloud config set project PROJECT_ID');
  console.error('');
  console.error('or run this script with:');
  console.error('');
  console.error('  GOOGLE_CLOUD_PROJECT=PROJECT_ID npm run release:android:create-play-key');
  console.error('');
  console.error('Your Google account also needs permission to enable services and create service account keys on that project.');
  console.error('');
  console.error(error.message);
  process.exit(1);
}

if (!canDescribeServiceAccount()) {
  run('gcloud', [
    'iam',
    'service-accounts',
    'create',
    serviceAccountName,
    '--project',
    projectId,
    '--display-name',
    'UNIT Google Play Publisher',
  ], { stdio: 'inherit' });
}

if (!existsSync(keyPath)) {
  run('gcloud', [
    'iam',
    'service-accounts',
    'keys',
    'create',
    keyPath,
    '--iam-account',
    serviceAccountEmail,
    '--project',
    projectId,
  ], { stdio: 'inherit' });
}

console.log(`Google Play service account: ${serviceAccountEmail}`);
console.log(`Google Play key path: ${keyPath}`);
console.log('Grant this service account access to the app in Google Play Console API access.');
