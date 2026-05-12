import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const required = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_APP_URL',
];
const recommended = [
  'EXPO_PUBLIC_SUPPORT_EMAIL',
  'EXPO_PUBLIC_SENTRY_DSN',
];
const sentryUploadVars = [
  'SENTRY_ORG',
  'SENTRY_PROJECT',
  'SENTRY_AUTH_TOKEN',
];
const validEnvironments = new Set(['development', 'staging', 'production']);
const expectedAppUrls = {
  development: 'unit-dev://',
  staging: 'unit-staging://',
  production: 'unit://',
};
const expectedVariants = {
  development: 'development',
  staging: 'staging',
  production: 'production',
};

function readEnvFile(path) {
  const env = {};
  if (!existsSync(path)) {
    return env;
  }

  const contents = readFileSync(path, 'utf8');

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }

  return env;
}

function readLocalEnv(releaseEnv) {
  return {
    ...readEnvFile(resolve(process.cwd(), '.env.local')),
    ...readEnvFile(resolve(process.cwd(), `.env.${releaseEnv}.local`)),
  };
}

function isPlaceholder(value) {
  return !value || /your-|placeholder|example|changeme/i.test(value);
}

const releaseEnv = process.env.EXPO_PUBLIC_ENV ?? process.env.APP_VARIANT ?? 'production';
const localEnv = readLocalEnv(releaseEnv);

if (!validEnvironments.has(releaseEnv)) {
  console.error(`Invalid release environment: ${releaseEnv}`);
  console.error('Use EXPO_PUBLIC_ENV=staging or EXPO_PUBLIC_ENV=production for release checks.');
  process.exit(1);
}

const missing = required.filter((key) => isPlaceholder(process.env[key] ?? localEnv[key]));

if (missing.length > 0) {
  console.error('Missing release env vars:');
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  console.error('\nSet these in unit/.env.local for local checks and in Expo/EAS production environment before building.');
  process.exit(1);
}

const sentryUploadDisabled = (process.env.SENTRY_DISABLE_AUTO_UPLOAD ?? localEnv.SENTRY_DISABLE_AUTO_UPLOAD) === 'true';
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? localEnv.EXPO_PUBLIC_SENTRY_DSN;
const missingSentryUpload = sentryUploadVars.filter((key) => isPlaceholder(process.env[key] ?? localEnv[key]));
if (!sentryUploadDisabled && !isPlaceholder(sentryDsn) && missingSentryUpload.length > 0) {
  console.error('Missing Sentry source-map upload vars:');
  for (const key of missingSentryUpload) {
    console.error(`- ${key}`);
  }
  console.error('\nSet these in EAS when source-map upload is enabled, or set SENTRY_DISABLE_AUTO_UPLOAD=true.');
  process.exit(1);
}

const configuredPublicEnv = process.env.EXPO_PUBLIC_ENV ?? localEnv.EXPO_PUBLIC_ENV ?? releaseEnv;
if (configuredPublicEnv !== releaseEnv) {
  console.error(`EXPO_PUBLIC_ENV must be ${releaseEnv} for this release check.`);
  process.exit(1);
}

const appUrl = process.env.EXPO_PUBLIC_APP_URL ?? localEnv.EXPO_PUBLIC_APP_URL;
const expectedAppUrl = expectedAppUrls[releaseEnv];
if (appUrl !== expectedAppUrl) {
  console.error(`EXPO_PUBLIC_APP_URL must be ${expectedAppUrl} for ${releaseEnv} builds.`);
  process.exit(1);
}

const appVariant = process.env.APP_VARIANT ?? localEnv.APP_VARIANT ?? expectedVariants[releaseEnv];
if (appVariant !== expectedVariants[releaseEnv]) {
  console.error(`APP_VARIANT must be ${expectedVariants[releaseEnv]} for ${releaseEnv} release checks.`);
  process.exit(1);
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? localEnv.EXPO_PUBLIC_SUPABASE_URL;
if (releaseEnv !== 'development' && /localhost|127\.0\.0\.1/.test(supabaseUrl)) {
  console.error('Staging/production release checks cannot point at a local Supabase URL.');
  process.exit(1);
}

const unsetRecommended = recommended.filter((key) => isPlaceholder(process.env[key] ?? localEnv[key]));
if (unsetRecommended.length > 0) {
  console.warn(`Recommended release vars not set: ${unsetRecommended.join(', ')}`);
}

console.log(`release-env-ok:${releaseEnv}`);
