# Production Readiness Sync Runbook

This runbook is versioned in the `unit/` repo and is written from the canonical project root. It is the production target for the current UNIT relationship-sync release. It keeps the current `profiles.property_ids` model and treats normalized membership tables as a post-release project.

## Stop Rules

- Do not run production mutations until the dirty worktree is classified and reviewed.
- Do not run production migrations without a fresh Supabase backup or `pg_dump`.
- Do not deploy Edge Functions until `cd unit && npm run edge:check` passes for every function under `unit/supabase/functions`.
- Do not proceed after five failed attempts at the same blocker without switching approach.
- Stop after ten failed attempts on the same blocker and document the remaining blocker.

## Pre-Production Gates

1. Classify worktree changes using `WORKTREE_CLASSIFICATION.md`.
2. Run a secret scan over tracked and untracked release candidates.
3. Confirm production ownership for Supabase, Vercel, Stripe, Expo/EAS, Apple, Google Play, Sentry, and Resend.
4. Confirm production env vars:
   - Portal: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SENTRY_DSN`.
   - Mobile: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_APP_URL=unit://`, `EXPO_PUBLIC_SENTRY_DSN`, `APP_VARIANT=production`, `EXPO_PUBLIC_ENV=production`.
   - Edge Functions: `STRIPE_SECRET_KEY`, `MOBILE_APP_URL=unit://`, `SENTRY_DSN`, `APP_ENV=production`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
5. Run local validation with Node 20:
   - `cd portal && npm ci && npm run release:check && npm run test:e2e:full`
   - `cd unit && npm ci && npm run release:check && npm run edge:check && npm run db:test:security && npm run e2e:doctor`

## Production Deployment Order

Run Supabase commands from the `unit/` repo root, because migrations and functions live under `unit/supabase`.

1. Take production database backup.
2. Save pre-migration relationship audit:
   - run `scripts/relationship-audit.sql` against production and archive output.
3. Link production Supabase project:
   - `supabase link --project-ref <production-ref>`
4. Apply migrations:
   - `supabase db push`
5. Set Edge Function secrets:
   - `supabase secrets set STRIPE_SECRET_KEY=<value>`
   - `supabase secrets set STRIPE_WEBHOOK_SECRET=<value>`
   - `supabase secrets set MOBILE_APP_URL=unit://`
   - `supabase secrets set SENTRY_DSN=<value>`
   - `supabase secrets set APP_ENV=production`
   - `supabase secrets set EXPO_ACCESS_TOKEN=<value>`
   - `supabase secrets set RESEND_API_KEY=<value>`
   - `supabase secrets set RESEND_FROM_EMAIL=<value>`
6. Deploy functions:
   - use `.github/workflows/supabase-deploy.yml`, or deploy the same function list manually from that workflow.
7. Save post-migration relationship audit and compare against pre-migration output.
8. Deploy portal production after database/functions are ready.
9. Build production mobile artifacts:
   - `cd unit && npm run release:ios:build`
   - `cd unit && npm run release:android:build`

## Production Smoke Tests

- Relationship smoke:
  - invite existing advertiser as tenant
  - approve advertiser in admin portal
  - confirm mobile admin sees the same advertiser status
  - suspend/reactivate tenant and confirm advertiser status mirrors
  - confirm business `owner_email + property_id` remains aligned
- Payment smoke:
  - create QA-tagged portal promotion
  - complete live payment using approved QA payment method
  - verify promotion becomes `paid + pending`
  - replay duplicate `checkout.session.completed`
  - verify idempotent payment attempt/status-event behavior
  - verify expired checkout path
  - refund QA charge if required
- Mobile smoke:
  - install production iOS/Android builds
  - create tenant promotion
  - complete checkout and deep-link return
  - confirm promotion/payment/status-event rows match portal schema
- Analytics smoke:
  - one view per promotion/session dedupes
  - repeated taps count
  - invalid user/property insert is blocked
  - portal totals match raw `ad_analytics`
- Error-path smoke:
  - checkout blocked after tenant property removal
  - advertiser approval blocked without tenant assignment
  - resubmit blocked when promotion property no longer belongs to tenant

## Monitoring And Rollback

Archive the deployed commit SHA, Vercel deployment ID, EAS build IDs, function list, database backup id, and pre/post drift audit outputs.

Rollback triggers:
- unexpected active account demotion
- payment state corruption
- Stripe webhook failure spike
- Edge Function error spike
- release-blocking drift audit rows
- production app cannot complete checkout/deep-link return

Watch for 24 hours:
- Sentry portal/mobile errors
- Supabase Edge Function logs
- Stripe webhook failures/retries
- failed checkout/payment attempts
- relationship drift after real user/admin activity
- analytics insert failures or dashboard mismatches
