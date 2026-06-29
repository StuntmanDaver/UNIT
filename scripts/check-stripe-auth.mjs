import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Stripe from 'stripe';

function readEnvFile(path) {
  const env = {};
  if (!existsSync(path)) return env;

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
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

const releaseEnv = process.env.NEXT_PUBLIC_ENV ?? 'production';
const localEnv = {
  ...readEnvFile(resolve(process.cwd(), '.env.local')),
  ...readEnvFile(resolve(process.cwd(), `.env.${releaseEnv}.local`)),
};
const stripeSecretKey = process.env.STRIPE_SECRET_KEY ?? localEnv.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('stripe-auth-failed: STRIPE_SECRET_KEY is not set');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-04-22.dahlia' });

try {
  await stripe.balance.retrieve();
  console.log('stripe-auth-ok');
} catch (error) {
  if (error?.type === 'StripeAuthenticationError') {
    console.error(`stripe-auth-failed: ${error.message.replace(stripeSecretKey, '[redacted-key]')}`);
    process.exit(1);
  }

  if (error?.type === 'StripePermissionError') {
    console.warn('stripe-auth-warning: key authenticated but cannot read balance; full checkout E2E must verify required restricted-key permissions.');
    process.exit(0);
  }

  throw error;
}
