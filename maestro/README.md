# UNIT Mobile — Maestro E2E Test Suite

End-to-end tests for the UNIT mobile app using [Maestro](https://maestro.mobile.dev/).

## Quick Start

```bash
# From unit/
npm run test:e2e                        # Run all flows in config.yaml
~/.maestro/bin/maestro test maestro/flows/qa-00-full-suite.yaml   # Full new suite
~/.maestro/bin/maestro test maestro/flows/qa-auth-01-login-validation.yaml  # Single flow
```

Set environment before running:
```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export MAESTRO_CLI_NO_ANALYTICS=1
```

---

## Simulator Prerequisites

| Requirement | Setup |
|---|---|
| iPhone 16 Pro Max simulator booted | Xcode → Simulator → Open |
| Metro bundler running | `npx expo start --ios` from `unit/` |
| Dev build installed | `eas build --profile development --platform ios --local` |
| Push notification permission | Granted during qa-01 or qa-permissions-01 |

---

## Seed Data Requirements

Every flow in `qa-00-full-suite.yaml` requires specific data to be present.
Run the SQL snippets below in Supabase Dashboard → SQL Editor before a full suite run.

### 1. Core test accounts (required by ALL flows)

These must exist in `auth.users` and `profiles`:

| Email | Password | Role |
|---|---|---|
| `tenant1@unit-test.com` | `admin123` | tenant |
| `david@cultrhealth.com` | `admin123` | landlord |

Verify:
```sql
SELECT email, role FROM public.profiles
WHERE email IN ('tenant1@unit-test.com', 'david@cultrhealth.com');
```

### 2. Test property with coordinates (required by qa-home-01)

The "Nearby (≤ 2 mi)" segment requires a property with `latitude`/`longitude` set
and at least one neighbor property within 2 miles:

```sql
-- Add coordinates to the primary test property
UPDATE public.properties
SET latitude = 37.7749, longitude = -122.4194  -- Replace with actual coords
WHERE name = 'Test Property';                   -- Replace with actual name

-- Verify
SELECT name, latitude, longitude FROM public.properties;
```

### 3. Activity feed items (required by qa-home-01, qa-promotion-detail-01)

At least one post or approved promotion must exist in tenant1's property:

```sql
-- Check existing activity
SELECT id, kind, created_at FROM public.activity_feed
WHERE property_id = (
  SELECT property_ids[1] FROM public.profiles WHERE email = 'tenant1@unit-test.com'
)
ORDER BY created_at DESC LIMIT 5;
```

If empty, create an announcement post via the community screen as tenant1 first,
or run `qa-community-01-create-announcement.yaml` standalone.

### 4. Approved advertiser promotion with CTA (required by qa-promotions-01, qa-promotion-detail-01)

```sql
-- Check for approved advertiser promos in tenant1's property
SELECT id, headline, review_status, kind, cta_text, cta_link
FROM public.promotions
WHERE property_id = (
  SELECT property_ids[1] FROM public.profiles WHERE email = 'tenant1@unit-test.com'
)
AND kind = 'advertiser'
AND review_status = 'approved'
LIMIT 5;
```

If missing: run `qa-admin-06-new-external-promo.yaml` then `qa-admin-05-promo-review-all-actions.yaml`
(approve case) to create one.

### 5. Active pricing tiers (required by qa-promotions-02, qa-promotions-03, m5-02)

```sql
-- Check pricing tiers
SELECT id, name, duration_days, price_cents, is_active FROM public.promotion_pricing_tiers
WHERE is_active = true;
```

If empty: run `qa-admin-07-pricing-tier-crud.yaml` to create tiers first.

Minimum data needed:
```sql
INSERT INTO public.promotion_pricing_tiers (name, duration_days, price_cents, is_active, is_featured)
VALUES ('7-Day Standard', 7, 2999, true, false),
       ('14-Day Featured', 14, 4999, true, true);
```

### 6. Pending advertiser promotions (required by qa-admin-04, qa-admin-05)

At least 4 promotions in `review_status = 'pending'` to test Approve, Allow Revision,
Require Repayment, and Reject in sequence:

```sql
-- Check count
SELECT COUNT(*) FROM public.promotions
WHERE property_id = (
  SELECT property_ids[1] FROM public.profiles WHERE email = 'david@cultrhealth.com'
)
AND review_status = 'pending'
AND kind = 'advertiser';
```

To create pending promotions: run `qa-promotions-02-create-cancel-paths.yaml` 4 times as tenant1
(each run creates one promotion that starts in pending state).

### 7. Unread notification for tenant1 (required by qa-alerts-01)

```sql
-- Insert a test notification
INSERT INTO public.notifications (user_id, property_id, title, message, type, read)
SELECT
  p.id,
  p.property_ids[1],
  'QA Test Notification',
  'This notification was seeded for E2E testing.',
  'post',
  false
FROM public.profiles p
WHERE p.email = 'tenant1@unit-test.com';
```

### 8. Reset-required account (required by qa-auth-03)

```sql
-- Set needs_password_change = true for the test reset account
-- First ensure the account exists in Supabase Auth, then:
UPDATE public.profiles
SET needs_password_change = true
WHERE email = 'tenant-reset@unit-test.com';
```

Create the account first via admin invite or Supabase Auth dashboard
with password `TempPass123!`.

---

## Flow Inventory

### Auth & Onboarding

| File | Items | Description |
|---|---|---|
| `qa-auth-01-login-validation.yaml` | 1–11 | Login validation, wrong password, forgot password, admin/tenant login |
| `qa-auth-02-signup-edge.yaml` | 13–16 | Mismatched passwords, existing email, Log In link |
| `qa-auth-03-reset-password.yaml` | 17–20 | Reset password validation + happy path |
| `qa-auth-04-onboarding-edge.yaml` | 21–36 | Property search, back navigation, sign out at step |
| `qa-auth-05-routing-redirects.yaml` | 37–43 | Cold start, session restore, role redirects |

### Tenant Screens

| File | Items | Description |
|---|---|---|
| `qa-home-01-feed-states.yaml` | 48–55 | Feed segments, skeleton, pull-to-refresh, card tap |
| `qa-directory-01-search-states.yaml` | 56–64 | Search, category filter, empty states, card tap |
| `qa-business-01-contact-actions.yaml` | 65–74 | Phone/email/website/share actions |
| `qa-community-01-create-announcement.yaml` | 75–92 | Browse segments, create announcement |
| `qa-community-02-create-event.yaml` | 85–86 | Create event post with date |
| `qa-promotions-01-segments-analytics.yaml` | 93–102 | Segments, analytics scroll, CTA tap, FAB |
| `qa-promotions-02-create-cancel-paths.yaml` | 103–114 | Full promo form + cancel |
| `qa-promotions-03-pending-payment-edges.yaml` | 115–124 | Tier selection, save-for-later |
| `qa-promotion-detail-01.yaml` | 125–128 | Render + back navigation |
| `m5-02-tenant-paid-promotion.yaml` | 119–120 | Stripe happy path (tag: stripe) |
| `qa-alerts-01-mark-read.yaml` | 129–134 | Mark read, mark all read, navigate by type |
| `qa-profile-01-qr-share.yaml` | 136–144 | Edit profile link, QR share, version |
| `qa-profile-02-push-toggle.yaml` | 145–146 | Push enable/disable switch |
| `qa-profile-03-edit-full.yaml` | 151–159 | Full field edit, validation, save, cancel |

### Admin Screens

| File | Items | Description |
|---|---|---|
| `qa-admin-01-dashboard-nav.yaml` | 160–176 | Property selector, all stat+action cards, logout |
| `qa-admin-02-tenants-add-invite.yaml` | 177–195 | Search, segments, add tenant modal, status toggle |
| `qa-admin-03-properties-create.yaml` | 197–204 | Add property modal, create, cancel |
| `qa-admin-04-advertisers-segments.yaml` | 205–210 | Segments, 30-day hint, row tap |
| `qa-admin-05-promo-review-all-actions.yaml` | 216–227 | All review actions + suspend/reinstate |
| `qa-admin-06-new-external-promo.yaml` | 228–236 | Full external promotion form |
| `qa-admin-07-pricing-tier-crud.yaml` | 237–246 | Add/edit/deactivate tier |
| `qa-admin-08-push-broadcast-full.yaml` | 247–257 | Compose, audience, send confirm, history |

### Cross-Cutting

| File | Items | Description |
|---|---|---|
| `qa-deeplink-01-stripe-return.yaml` | 272–274 | Stripe SVC dismiss, cancel path |
| `qa-permissions-01-push-photo.yaml` | 266–267, 275–276 | Push + photo library permission prompts |

### Legacy Flows (kept for reference)

| File | Description |
|---|---|
| `m1-05-onboarding.yaml` | Fresh signup → full onboarding happy path |
| `m2-01-profile-edit.yaml` | Profile edit (business name only) |
| `m2-02-directory.yaml` | Directory browse + category filter |
| `m2-03-business-detail.yaml` | Business card → detail |
| `m2-04-create-promotion.yaml` | Legacy promotion create (no payment) |
| `m2-06-admin-review.yaml` | Admin approve (single action) |
| `m2-07-local-deals.yaml` | Local Deals segment |
| `m5-01-home-feed.yaml` | Home feed (dev-build aware) |
| `m5-02-tenant-paid-promotion.yaml` | Stripe happy path |
| `admin-01-02-csv-import.yaml` | CSV import (semi-automated) |
| `admin-03-tenant-management.yaml` | Tenant search + segments |
| `qa-04-full-sweep.yaml` | Legacy sweep (superseded by qa-00) |
| `qa-05-light-surface-sweep.yaml` | Visual regression screenshots |

---

## Known Automation Limits

These require manual QA or alternative tooling:

| Limitation | Workaround |
|---|---|
| iOS file picker (CSV import) | Semi-auto in admin-01-02; document manual step |
| Stripe Checkout iframe input | Covered by m5-02 with fragile text selectors |
| Native share sheet content assertion | Can assert sheet opens, not recipient |
| OS permission denial path | Reset simulator, tap "Don't Allow", verify manually |
| Cold-start push notification tap | `getLastNotificationResponseAsync` not implemented in app |
| Multi-device push delivery | Requires real devices, not simulator |
| Alert.prompt (refund reason) | iOS-specific, not testable in Maestro flows |

---

## testID Reference

All `testID` props available for Maestro `id:` selectors:

| testID | Location | Used by |
|---|---|---|
| `login-email` | `app/(auth)/login.tsx` | all login flows |
| `login-password` | `app/(auth)/login.tsx` | all login flows |
| `btn-login-submit` | `app/(auth)/login.tsx` | qa-auth-01 |
| `btn-signup-submit` | `app/(auth)/signup.tsx` | qa-auth-02 |
| `btn-create-profile` | `app/(auth)/onboarding.tsx` | qa-auth-04 |
| `property-list-item` | `app/(auth)/onboarding.tsx` | qa-auth-04 |
| `unit-list-item` | `app/(auth)/onboarding.tsx` | qa-auth-04 |
| `btn-update-password` | `app/(auth)/reset-password.tsx` | qa-auth-03 |
| `category-chips-list` | `components/ui/CategoryChips.tsx` | qa-directory-01, m2-02 (horizontal swipe anchor) |
| `onboarding-category-scroll` | `app/(auth)/onboarding.tsx` | m1-05 (horizontal swipe anchor) |
| `business-card` | `components/tenant/BusinessCard.tsx` | qa-directory-01, m2-03 (business card tap) |
| `back-btn` | `app/(tabs)/directory/[id].tsx` | qa-directory-01, m2-03 (replaces unreliable `back` action) |
| `tab-home` | `app/(tabs)/_layout.tsx` | all tenant flows |
| `tab-directory` | `app/(tabs)/_layout.tsx` | qa-directory-01 |
| `tab-promotions` | `app/(tabs)/_layout.tsx` | qa-promotions-* |
| `tab-community` | `app/(tabs)/_layout.tsx` | qa-community-* |
| `tab-alerts` | `app/(tabs)/_layout.tsx` | qa-alerts-01 |
| `tab-profile` | `app/(tabs)/_layout.tsx` | qa-profile-* |
| `search-input` | `components/ui/SearchBar.tsx` | qa-directory-01, qa-admin-02 |
| `fab-create-promotion` | `app/(tabs)/promotions.tsx` | qa-promotions-* |
| `promotion-headline` | `app/(tabs)/promotions/create.tsx` | qa-promotions-02 |
| `promotion-description` | `app/(tabs)/promotions/create.tsx` | qa-promotions-02 |
| `promotion-start-date` | `app/(tabs)/promotions/create.tsx` | qa-promotions-02 |
| `promotion-end-date` | `app/(tabs)/promotions/create.tsx` | qa-promotions-02 |
| `promotion-submit` | `app/(tabs)/promotions/create.tsx` | qa-promotions-02 |
| `business-contact-phone` | `app/(tabs)/directory/[id].tsx` | qa-business-01 |
| `business-contact-email` | `app/(tabs)/directory/[id].tsx` | qa-business-01 |
| `business-contact-website` | `app/(tabs)/directory/[id].tsx` | qa-business-01 |
| `business-share-qr` | `app/(tabs)/directory/[id].tsx` | qa-business-01 |
| `btn-post-submit` | `app/(tabs)/community/create.tsx` | qa-community-01 |
| `profile-push-switch` | `app/(tabs)/profile.tsx` | qa-profile-02 |
| `profile-logo-picker` | `app/(tabs)/profile/edit.tsx` | qa-permissions-01 |
| `btn-profile-save` | `app/(tabs)/profile/edit.tsx` | qa-profile-03 |
| `admin-logout-btn` | `app/(admin)/index.tsx` | all admin flows |
| `pricing-tier-name` | `app/(admin)/pricing.tsx` | qa-admin-07 |
| `pricing-tier-duration` | `app/(admin)/pricing.tsx` | qa-admin-07 |
| `pricing-tier-price` | `app/(admin)/pricing.tsx` | qa-admin-07 |
| `pricing-tier-featured` | `app/(admin)/pricing.tsx` | qa-admin-07 |
| `pricing-tier-active` | `app/(admin)/pricing.tsx` | qa-admin-07 |
| `push-title-input` | `app/(admin)/push.tsx` | qa-admin-08 |
| `push-message-input` | `app/(admin)/push.tsx` | qa-admin-08 |
