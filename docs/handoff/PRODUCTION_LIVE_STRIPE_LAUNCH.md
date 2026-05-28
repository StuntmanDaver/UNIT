# Production Live Stripe Launch

Complete this checklist before final live Stripe testing, TestFlight/App Store
submission, or production rollout. Keep live keys and service-role secrets only
in Stripe, Vercel/host, Supabase, and EAS secret stores.

## Required Accounts

- Client-owned Stripe, Supabase, Vercel/portal host, Expo/EAS, Apple Developer,
  Google Play, Sentry, and GitHub accounts are accessible with 2FA enabled.
- Staging and production use separate Supabase projects, Stripe keys, webhook
  endpoints, Vercel env vars, and EAS build profiles.
- Production portal URL is `https://unit-portal-one.vercel.app`.
- Production mobile identifiers are `com.unitapp.mobile` and `unit://`.

## Stripe Live Mode

- Complete Stripe live-mode business verification, payout bank, public profile,
  tax/compliance prompts, and team access review.
- Configure production host secrets:
  - `STRIPE_SECRET_KEY=sk_live_...` or a least-privilege live restricted key
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`
  - `STRIPE_WEBHOOK_SECRET=whsec_...`
- Create a live webhook endpoint:
  - URL: `https://unit-portal-one.vercel.app/api/webhooks/stripe`
  - Events: `checkout.session.completed`, `checkout.session.expired`,
    `payment_intent.payment_failed`
- Confirm Radar, dispute, payout, and payment-failure notifications route to an
  owned team mailbox.

## Portal Production Env

Set these in the production host:

```text
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_APP_URL=https://unit-portal-one.vercel.app
NEXT_PUBLIC_SUPABASE_URL=<production Supabase URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production anon key>
SUPABASE_SERVICE_ROLE_KEY=<production service role key>
STRIPE_SECRET_KEY=<live Stripe secret or restricted key>
STRIPE_WEBHOOK_SECRET=<live Stripe webhook signing secret>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<live Stripe publishable key>
NEXT_PUBLIC_SENTRY_DSN=<recommended>
SENTRY_ORG=<required only if source-map upload is enabled>
SENTRY_PROJECT=<required only if source-map upload is enabled>
SENTRY_AUTH_TOKEN=<required only if source-map upload is enabled>
```

Then redeploy and run:

```bash
cd portal
NEXT_PUBLIC_ENV=production npm run release:check-env
npm run release:check
```

The check must pass without `ALLOW_PRODUCTION_STRIPE_TEST_MODE=1`.

## Supabase Production

- Apply all migrations to production.
- Confirm payment tables/columns exist:
  `promotions.current_payment_intent_id`,
  `promotion_payment_attempts.stripe_checkout_session_id`,
  `promotion_payment_attempts.stripe_payment_intent_id`,
  `promotion_status_events`, and `stripe_webhook_events.completed_at`.
- Set Edge Function secrets for production payment/refund flows:
  `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_ANON_KEY`.
- Deploy production Edge Functions used by checkout, refunds, push, invites,
  onboarding, and scheduled maintenance.

## Mobile/EAS and App Store

Set EAS production values:

```text
APP_VARIANT=production
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_APP_URL=unit://
EXPO_PUBLIC_SUPABASE_URL=<production Supabase URL>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<production anon key>
EXPO_PUBLIC_SUPPORT_EMAIL=<support mailbox>
EXPO_PUBLIC_SENTRY_DSN=<recommended>
SENTRY_DISABLE_AUTO_UPLOAD=true
```

Verify:

```bash
cd unit
npm run release:check
npm run appstore:auth:check
```

Fastlane/App Store values required for TestFlight distribution:

```text
APP_STORE_CONNECT_API_KEY_ID
APP_STORE_CONNECT_API_ISSUER_ID
APP_STORE_CONNECT_API_KEY_PATH
IOS_BUNDLE_ID=com.unitapp.mobile
ASC_APP_ID=6767079612
TESTFLIGHT_GROUPS
PILOT_BETA_APP_DESCRIPTION
PILOT_CHANGELOG
PILOT_REVIEW_EMAIL
PILOT_REVIEW_PHONE
```

## Final Live Test

1. Deploy the final portal build.
2. Build or distribute the production iOS app:

   ```bash
   cd unit
   npm run release:ios:testflight
   ```

3. Run production iOS E2E against QA-marked accounts:

   ```bash
   E2E_TARGET=production \
   E2E_ALLOW_PRODUCTION=1 \
   E2E_ALLOW_SHARED_ADMIN_RESET=1 \
   E2E_EXPECTED_SUPABASE_URL=<production Supabase URL> \
   E2E_START_METRO=0 \
   npm run e2e:auto:ios
   ```

4. Perform one low-dollar live Stripe Checkout.
5. Verify:
   - Stripe payment succeeds.
   - Stripe webhook delivery to `/api/webhooks/stripe` succeeds.
   - `promotions.payment_status = paid`.
   - `promotions.review_status = pending`.
   - `promotion_payment_attempts.status = completed`.
   - `stripe_webhook_events.completed_at` is populated.
   - `promotion_status_events.actor_type = webhook`.
   - The app returns through `unit://` and shows awaiting review.
6. Refund the internal live payment if desired and verify the refund path.

## App Review Go/No-Go

The release owner must explicitly choose:

- **Go:** keep Stripe Checkout for iOS promotion placement and submit with
  reviewer notes that explain the advertising-placement use case.
- **No-go:** pause iOS live release until paid promotion purchase is moved to an
  Apple IAP-compatible model or hidden from iOS.

Reviewer notes must include tenant/admin demo accounts, support contact, privacy
policy URL, terms URL, and exact steps to create, pay for, and review a
promotion.

## Rollback

- If webhook delivery fails, fix host env/deploy state and replay the Stripe
  event from the Dashboard.
- If payment succeeds but the promotion remains unpaid, inspect Stripe event
  delivery, `stripe_webhook_events`, `promotion_payment_attempts`, portal logs,
  and Sentry.
- If a key is exposed, roll it in Stripe, rotate host secrets, redeploy, and
  review Stripe Workbench logs immediately.
