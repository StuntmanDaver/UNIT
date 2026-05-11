# UNIT Advertiser Portal

Next.js 15 portal for UNIT advertisers to create an account, submit promotions, pay through Stripe Checkout, and review promotion analytics. The portal shares the UNIT Supabase backend used by the Expo mobile app.

## Prerequisites

- Node.js 18+
- npm
- Access to the UNIT Supabase project
- Stripe account and Stripe CLI for local webhook testing

## Environment

Create `portal/.env.local` from `portal/.env.local.example` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

Notes:
- `NEXT_PUBLIC_APP_URL` must match the portal origin used for checkout redirects.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never expose it to client code or commit it.
- Production must use Stripe live-mode keys: `STRIPE_SECRET_KEY=sk_live_...`,
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`, and the signing secret
  from the live-mode webhook endpoint.
- Sentry variables are optional unless release upload/monitoring is enabled for the deployment.

## Local Development

```bash
cd portal
npm install
npm run dev
```

Open `http://localhost:3000`.

### Stripe Webhooks

Use the Stripe CLI in a second terminal:

```bash
cd portal
stripe login
npm run dev:stripe
```

Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET` in `portal/.env.local`. The local forwarder sends events to `http://localhost:3000/api/webhooks/stripe`.

## Supabase Dependency

The portal expects the shared UNIT Supabase schema and RLS policies to be deployed before use. Required areas include:

- Auth users and cookie-based sessions through `@supabase/ssr`
- `advertiser_profiles`
- `promotions`
- `promotion_payment_attempts`
- `ad_analytics`
- Storage/public asset access used by promotion creative

Apply migrations from the project root `supabase/` workspace before launch, then confirm the portal environment points at the same Supabase project as the mobile app.

## Test Commands

```bash
npm run lint
npm run test
npm run test:coverage
npm run build
npm run release:check
npm run test:e2e
```

`npm run test:e2e` writes Playwright output to `playwright-report/` and `test-results/`, which are generated artifacts.

`npm run release:check` validates required portal environment variables without printing secret values, then runs lint, unit tests, and the production build. Production fails fast if Stripe is still configured with sandbox/test keys.

## Deploy Notes

- Deploy from the `portal/` directory. On Vercel, set the project root directory to `portal`.
- Configure all production environment variables in the host, with `NEXT_PUBLIC_APP_URL` set to the production portal URL.
- In Stripe Dashboard, add a production webhook endpoint for `https://<portal-domain>/api/webhooks/stripe` and store its signing secret as `STRIPE_WEBHOOK_SECRET`.
- Set the same live `STRIPE_SECRET_KEY` in both Vercel and Supabase Edge Function secrets so portal Checkout, mobile Checkout, and refunds all hit the same live Stripe account.
- Keep Stripe keys, Supabase service role keys, and Sentry auth tokens out of source control.
- Run `npm run build` with production env vars before promoting the release.
- Run `npm run release:check` before connecting the mobile TestFlight build to a production portal.

## Manual Launch Checklist

- Production Supabase migrations are applied.
- Production portal env vars are set and verified.
- Stripe Checkout succeeds in test mode and webhook payment confirmation updates promotion state.
- Advertiser signup/login works with Supabase auth cookies.
- Promotion creation, payment, resubmission, and analytics pages load.
- `npm run release:check` passes.
- Production Stripe webhook endpoint is enabled before going live.
