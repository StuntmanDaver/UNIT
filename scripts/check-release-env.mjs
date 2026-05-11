import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_APP_URL',
];
const recommended = [
  'NEXT_PUBLIC_SENTRY_DSN',
];
const sentryUploadVars = [
  'SENTRY_ORG',
  'SENTRY_PROJECT',
  'SENTRY_AUTH_TOKEN',
];
const validEnvironments = new Set(['development', 'preview', 'staging', 'production']);

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
  return !value || /your-|placeholder|example|changeme|\.\.\./i.test(value);
}

const releaseEnv = process.env.NEXT_PUBLIC_ENV ?? 'production';
const localEnv = readLocalEnv(releaseEnv);

if (!validEnvironments.has(releaseEnv)) {
  console.error(`Invalid NEXT_PUBLIC_ENV: ${releaseEnv}`);
  console.error('Use development, preview, staging, or production.');
  process.exit(1);
}

const missing = required.filter((key) => isPlaceholder(process.env[key] ?? localEnv[key]));

if (missing.length > 0) {
  console.error('Missing production portal env vars:');
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  console.error('\nSet these in portal/.env.local for local checks and in the production host before deploying.');
  process.exit(1);
}

const sentryUploadDisabled = (process.env.SENTRY_DISABLE_AUTO_UPLOAD ?? localEnv.SENTRY_DISABLE_AUTO_UPLOAD) === 'true';
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? localEnv.NEXT_PUBLIC_SENTRY_DSN;
const missingSentryUpload = sentryUploadVars.filter((key) => isPlaceholder(process.env[key] ?? localEnv[key]));
if (!sentryUploadDisabled && !isPlaceholder(sentryDsn) && missingSentryUpload.length > 0) {
  console.error('Missing Sentry source-map upload vars:');
  for (const key of missingSentryUpload) {
    console.error(`- ${key}`);
  }
  console.error('\nSet these in Vercel when source-map upload is enabled, or set SENTRY_DISABLE_AUTO_UPLOAD=true.');
  process.exit(1);
}

const configuredPublicEnv = process.env.NEXT_PUBLIC_ENV ?? localEnv.NEXT_PUBLIC_ENV ?? releaseEnv;
if (configuredPublicEnv !== releaseEnv) {
  console.error(`NEXT_PUBLIC_ENV must be ${releaseEnv} for this release check.`);
  process.exit(1);
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? localEnv.NEXT_PUBLIC_APP_URL;
if (releaseEnv !== 'development' && appUrl?.includes('localhost')) {
  console.error('NEXT_PUBLIC_APP_URL cannot point at localhost for staging/production deploys.');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? localEnv.NEXT_PUBLIC_SUPABASE_URL;
if (releaseEnv !== 'development' && /localhost|127\.0\.0\.1/.test(supabaseUrl)) {
  console.error('Staging/production deploys cannot point at a local Supabase URL.');
  process.exit(1);
}

const stripeSecret = process.env.STRIPE_SECRET_KEY ?? localEnv.STRIPE_SECRET_KEY;
const stripePublishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? localEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
if (releaseEnv === 'staging' && (!stripeSecret?.startsWith('sk_test_') || !stripePublishable?.startsWith('pk_test_'))) {
  console.error('Staging must use Stripe test mode keys.');
  process.exit(1);
}

if (releaseEnv === 'production') {
  const stripeModeErrors = [];
  if (!stripeSecret?.startsWith('sk_live_')) {
    stripeModeErrors.push('STRIPE_SECRET_KEY must use a live-mode sk_live_ key for production.');
  }
  if (!stripePublishable?.startsWith('pk_live_')) {
    stripeModeErrors.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must use a live-mode pk_live_ key for production.');
  }
  if (stripeModeErrors.length > 0) {
    console.error('Production Stripe configuration is still in sandbox/test mode:');
    for (const error of stripeModeErrors) {
      console.error(`- ${error}`);
    }
    console.error('\nCreate a live Stripe webhook endpoint, update the production host secrets, and rerun release:check.');
    process.exit(1);
  }
}

const unsetRecommended = recommended.filter((key) => isPlaceholder(process.env[key] ?? localEnv[key]));
if (unsetRecommended.length > 0) {
  console.warn(`Recommended release vars not set: ${unsetRecommended.join(', ')}`);
}

console.log(`release-env-ok:${releaseEnv}`);
