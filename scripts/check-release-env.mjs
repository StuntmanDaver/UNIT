import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env.local');
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_APP_URL',
];
const optional = [
  'NEXT_PUBLIC_SENTRY_DSN',
  'SENTRY_AUTH_TOKEN',
];

function readLocalEnv() {
  if (!existsSync(envPath)) {
    return {};
  }

  const env = {};
  const contents = readFileSync(envPath, 'utf8');

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

function isPlaceholder(value) {
  return !value || /your-|placeholder|example|changeme|\.\.\./i.test(value);
}

const localEnv = readLocalEnv();
const missing = required.filter((key) => isPlaceholder(process.env[key] ?? localEnv[key]));

if (missing.length > 0) {
  console.error('Missing production portal env vars:');
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  console.error('\nSet these in portal/.env.local for local checks and in the production host before deploying.');
  process.exit(1);
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? localEnv.NEXT_PUBLIC_APP_URL;
if (appUrl?.includes('localhost')) {
  console.warn('Warning: NEXT_PUBLIC_APP_URL points at localhost. Production deploys need the public portal origin.');
}

const stripeSecret = process.env.STRIPE_SECRET_KEY ?? localEnv.STRIPE_SECRET_KEY;
const stripePublishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? localEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
if (stripeSecret?.startsWith('sk_test_') || stripePublishable?.startsWith('pk_test_')) {
  console.warn('Warning: Stripe is configured in test mode. That is fine for TestFlight QA, but live production needs live Stripe keys.');
}

const unsetOptional = optional.filter((key) => isPlaceholder(process.env[key] ?? localEnv[key]));
if (unsetOptional.length > 0) {
  console.warn(`Optional release observability vars not set: ${unsetOptional.join(', ')}`);
}

console.log('release-env-ok');
