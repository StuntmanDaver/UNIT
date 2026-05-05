# US-021 / US-022 — Simulator UAT Rollup

**Status:** Code-complete on this branch (`ralph/engagement-ui-enhancement`). The autonomous Loki session that flipped US-021 and US-022 to `passes: true` could not run the iOS simulator, Maestro CLI, or live Stripe test-mode integration. This document is the explicit re-run checklist before merge to `main`.

## Prerequisites

- iOS Simulator (Xcode 15+) booted with the dev build of UNIT installed
  - `cd unit && eas build --profile development --platform ios --local` (or use the existing dev client)
- Maestro CLI installed (`brew install maestro`)
- Dev Supabase project with all migrations applied (incl. `20260502000003_promotion_payment_attempts_price_tier.sql`)
- Edge Function deployed with **test-mode** Stripe key:
  - `npx supabase functions deploy create-promotion-checkout-session`
  - `npx supabase secrets set STRIPE_SECRET_KEY=<sk_test_...>`
- Portal webhook deployed on Vercel (or any HTTPS host) with
  `STRIPE_WEBHOOK_SECRET` matching the Stripe dashboard endpoint
- At least one **active** row in `promotion_price_tiers`
- `tenant1@unit-test.com / admin123` exists in the dev project (subflow uses these)

## Re-run checklist

### US-021: Maestro happy paths

- [ ] `cd unit && maestro test maestro/flows/m5-01-home-feed.yaml` → all green
- [ ] `cd unit && maestro test maestro/flows/m5-02-tenant-paid-promotion.yaml` → all green
  - Card field selectors are Stripe-controlled; if they have changed, update m5-02 selectors and append the diff to `unit/scripts/ralph/progress.txt`
- [ ] `cd unit && maestro test maestro/flows/qa-04-full-sweep.yaml` → all green (this also re-runs m5-02 inline)
- [ ] After the run, log into the dev Supabase dashboard and confirm:
  - `promotions` row created with `payment_status='paid' AND review_status='pending'`
  - `promotion_payment_attempts` row with `status='completed' AND price_tier_id IS NOT NULL`
  - `promotion_status_events` row with `to_review_status='pending'`
  - Admin push notification fired (or queued, if no push token registered)

### US-022: Final verification sweep

- [ ] `cd unit && npx tsc --noEmit` exits 0 (already green at code-complete)
- [ ] `cd unit && npm run brand-lint` exits 0 (already green at code-complete)
- [ ] `cd unit && npm test` exits 0 (already green: 65/65 jest)
- [ ] `cd unit && maestro test maestro/flows/qa-04-full-sweep.yaml` (covered above)
- [ ] Spot-check on iOS simulator:
  - `(tabs)/home.tsx` — Home feed renders ≥1 activity card; "My Property" / "Nearby" toggle responsive
  - `(tabs)/directory.tsx` — unchanged from main, no visual regression
  - `(tabs)/promotions.tsx` — unchanged from main, no visual regression
  - `(tabs)/promotions/pending-payment.tsx` — tier picker visible, Pay Now disabled until tier selected, success state ("Awaiting Review" + CheckCircle icon) renders after paid
  - `(tabs)/community.tsx` — unchanged from main, no visual regression
  - `(tabs)/profile.tsx` — unchanged from main, no visual regression
- [ ] Optional: run `accesslint-contrast-checker` against every file changed in this PRD; expected zero failures (brand-lint already enforces palette pairing)

## What to do if a step fails

- Maestro flow fails before Stripe redirect: re-run with `--debug-output` and post the screenshots into `progress.txt`. Likely causes: dev Supabase missing seed data, dev Edge Function missing STRIPE_SECRET_KEY, or selectors drifted (`Choose a tier` text changed).
- Stripe redirect succeeds but the screen never flips to "Awaiting Review": webhook didn't fire. Verify portal `STRIPE_WEBHOOK_SECRET` matches the dashboard, and that the Stripe dashboard endpoint subscribes to `checkout.session.completed`.
- Visual regression on any existing tab: revert the offending commit on this branch BEFORE merging. The CLAUDE.md guardrail is "do NOT break the app or UI."

## Sign-off

Once all checkboxes above are ticked, merge `ralph/engagement-ui-enhancement` → `main` and close the engagement-UI-enhancement initiative.
