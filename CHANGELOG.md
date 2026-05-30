# UNIT Portal — Changelog

## 2026-05-29 — Production portal E2E certification

### Changed
- **Live Stripe env gate** — Production release checks now require
  `STRIPE_WEBHOOK_SECRET` to use a Stripe webhook signing secret shape
  (`whsec_...`) in addition to the existing live `sk_live_...` and
  `pk_live_...` key requirements.

### Verified
- Guarded production-QA `npm run release:check` passed with Stripe test mode
  explicitly allowed for QA.
- Vercel production env names are present for `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_APP_URL`, and Supabase credentials without exposing values.
- The production alias `https://unit-portal-one.vercel.app` points at a Ready
  Vercel Production deployment, and `/api/webhooks/stripe` responds from Vercel
  with `405` to a HEAD request as expected for the POST-only webhook route.
- Production E2E doctor, seed, and cross-account sync passed before portal tests.
- `prod_full_cert_20260529_portal_rerun` passed 16/16 Playwright tests across
  Chromium and Mobile Safari, including admin authentication gates, admin
  property/review/account approval flow, and advertiser promotion creation
  reaching Stripe Checkout.
- Targeted fake-value env checks confirmed production fails when
  `STRIPE_WEBHOOK_SECRET` lacks `whsec_` and passes when the webhook secret,
  secret key, and publishable key have production-shaped prefixes.

### Remaining
- Unguarded live Stripe env check still requires production host live
  `sk_live_...`, `pk_live_...`, and `whsec_...` values before final live payment
  smoke testing.
- `ALLOW_PRODUCTION_STRIPE_TEST_MODE` is still configured in Vercel Production;
  remove or disable it before final live Stripe certification so test-mode keys
  cannot satisfy the production gate.

## 2026-05-27 — Production-QA release gate stabilization

### Fixed
- **Full seeded admin E2E** — The login helper now waits for the admin/dashboard redirect after clicking Sign In, avoiding a race where Playwright could assert the authenticated page before Supabase auth completed.

### Verified
- `npm run release:check` with guarded production-QA Stripe test mode.
- `npm run test:e2e -- --project=chromium --workers=1 --reporter=line` — 6 passed, 2 skipped.
- `npm run test:e2e:full -- --reporter=line` — 2 passed.
- `git diff --check`.
