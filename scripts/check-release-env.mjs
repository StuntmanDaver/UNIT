import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env.local');
const required = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_APP_URL',
];
const optional = [
  'EXPO_PUBLIC_SENTRY_DSN',
  'SENTRY_ORG',
  'SENTRY_PROJECT',
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
  return !value || /your-|placeholder|example|changeme/i.test(value);
}

const localEnv = readLocalEnv();
const missing = required.filter((key) => isPlaceholder(process.env[key] ?? localEnv[key]));

if (missing.length > 0) {
  console.error('Missing release env vars:');
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  console.error('\nSet these in unit/.env.local for local checks and in Expo/EAS production environment before building.');
  process.exit(1);
}

if ((process.env.EXPO_PUBLIC_APP_URL ?? localEnv.EXPO_PUBLIC_APP_URL) !== 'unit://') {
  console.warn('Warning: EXPO_PUBLIC_APP_URL should usually be unit:// so Stripe Checkout can deep-link back into the app.');
}

const unsetOptional = optional.filter((key) => isPlaceholder(process.env[key] ?? localEnv[key]));
if (unsetOptional.length > 0) {
  console.warn(`Optional release observability vars not set: ${unsetOptional.join(', ')}`);
}

console.log('release-env-ok');
