# Worktree Classification For Production Readiness

Do not discard or commit files automatically. Use this classification as the review queue for grouped commits.

## Commit Group A: Relationship Sync Fixes

Portal:
- `app/(portal)/promotions/new/actions.ts`
- `app/api/checkout/route.ts`
- `app/api/resubmit/route.ts`
- `app/api/webhooks/stripe/route.ts`
- `lib/admin/advertisers.ts`
- `lib/admin/promotions.ts`
- `lib/admin/tenants.ts`

Mobile / Supabase:
- `services/advertiserAccounts.ts`
- `services/promotions.ts`
- `services/profiles.ts`
- `supabase/functions/create-promotion-checkout-session/index.ts`
- `supabase/functions/invite-tenant/index.ts`
- `supabase/migrations/20260617000001_harden_advertiser_profile_sync.sql`
- `supabase/migrations/20260617000002_sync_tenant_advertiser_profile_status.sql`
- `supabase/migrations/20260617000003_backfill_tenant_advertiser_profile_status.sql`
- `supabase/migrations/20260617000004_require_property_assignment_for_advertiser_activation.sql`

Suggested commit: `fix(sync): tenant advertiser relationship guards`

## Commit Group B: Relationship And Production Tests

Portal:
- `__tests__/api/checkout.test.ts`
- `__tests__/api/resubmit.test.ts`
- `__tests__/admin/admin-promotions-actions.test.ts`
- `__tests__/admin/advertisers-actions.test.ts`
- `__tests__/promotions/new-actions.test.ts`
- `e2e/admin-full.spec.ts`
- `e2e/support/qa-seed.ts`

Mobile:
- `__tests__/services/advertiserAccounts.test.ts`
- `__tests__/services/promotions.test.ts`
- `maestro/flows/*.yaml`
- `maestro/subflows/*.yaml`

Suggested commit: `test(sync): admin portal and mobile relationship coverage`

## Commit Group C: Release And Test Infrastructure

Unit repo release infrastructure:
- `.github/workflows/supabase-deploy.yml`
- `scripts/relationship-audit.sql`
- `docs/handoff/*.md`

Portal sibling repo (`../portal` from the `unit/` repo root):
- `package.json`
- `package-lock.json`
- `playwright.config.ts`
- `vitest.no-setup.config.ts`
- `app/global-error.tsx`

Mobile / UNIT repo:
- `package.json`
- `package-lock.json`
- `jest.config.js`
- `jest.setup.js`
- `scripts/check-release-env.mjs`
- `scripts/check-app-icon.mjs`
- `scripts/e2e/*.mjs`
- `eas.json`
- `app.config.ts`
- `.github/workflows/android-release.yml`

Suggested commit: `chore(release): harden production readiness checks`

## Commit Group D: UI, Assets, And Store Metadata

Review separately because these are not required for relationship sync:
- `assets/*.png`
- `assets/unit-logo-brand.png`
- `store-assets/**`
- `components/ui/*`
- `components/tenant/PostCard.tsx`
- `app/(tabs)/**`
- `app/(admin)/**`
- `docs/deployment-runbook.md`
- `fastlane/report.xml`

Suggested commit: separate UI/store commit after visual review.

## Temporary Or Debug Candidates

Review before deleting:
- `debug-profile-upsert.ts`
- `debug-seed-roles.ts`
- `verify-inline.ts`
- `verify-portal-seed*.ts`
- `maestro/flows/.android-no-clear-*.yaml`
- `scripts/ralph/progress.txt`
- `scripts/ralph/prd.json`

If retained, move durable utilities into `scripts/` with clear names. If not retained, delete only after confirming no release script references them.
