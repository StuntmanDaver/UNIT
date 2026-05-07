-- E2E Test Data Seed Script
-- Run in Supabase Dashboard → SQL Editor before running qa-00-full-suite.yaml
--
-- Usage: Run each section individually, or all at once.
-- Teardown: Run seed-e2e-teardown.sql to remove created records.
--
-- Assumptions:
--   • tenant1@unit-test.com and david@cultrhealth.com exist in auth.users + profiles
--   • A test property exists associated with both accounts

-- ── 1. Get test account IDs (diagnostic, run first) ───────────────────────────
SELECT
  p.id,
  p.email,
  p.role,
  p.property_ids,
  p.needs_password_change,
  p.needs_onboarding
FROM public.profiles p
WHERE p.email IN (
  'tenant1@unit-test.com',
  'david@cultrhealth.com',
  'tenant-reset@unit-test.com'
);

-- ── 2. Set property coordinates for Nearby feed (replace property_id) ─────────
-- Replace '00000000-0000-0000-0000-000000000000' with actual property UUID.
/*
UPDATE public.properties
SET latitude = 37.7749, longitude = -122.4194
WHERE id = '00000000-0000-0000-0000-000000000000';
*/

-- ── 3. Seed unread notification for tenant1 ────────────────────────────────────
-- Required by: qa-alerts-01-mark-read.yaml
INSERT INTO public.notifications (user_id, property_id, title, message, type, read, created_at)
SELECT
  p.id,
  p.property_ids[1],
  'QA E2E Test Notification',
  'This notification was seeded for Maestro E2E testing. Safe to delete.',
  'post',
  false,
  NOW()
FROM public.profiles p
WHERE p.email = 'tenant1@unit-test.com'
  AND p.property_ids IS NOT NULL
  AND array_length(p.property_ids, 1) > 0
ON CONFLICT DO NOTHING;

-- ── 4. Seed active pricing tiers ──────────────────────────────────────────────
-- Required by: qa-promotions-02, qa-promotions-03, m5-02
INSERT INTO public.promotion_pricing_tiers (name, duration_days, price_cents, is_active, is_featured, created_at)
VALUES
  ('7-Day Standard',   7,  2999, true, false, NOW()),
  ('14-Day Featured', 14,  4999, true, true,  NOW()),
  ('30-Day Premium',  30,  9999, true, true,  NOW())
ON CONFLICT (name) DO UPDATE SET is_active = true;

-- ── 5. Set needs_password_change for reset test account ───────────────────────
-- Required by: qa-auth-03-reset-password.yaml
-- First ensure tenant-reset@unit-test.com exists in auth.users, then:
UPDATE public.profiles
SET needs_password_change = true
WHERE email = 'tenant-reset@unit-test.com';

-- ── 7. Seed 4 pending promotions for admin review tests ───────────────────────
-- Required by: qa-admin-05-promo-review-all-actions.yaml (needs 4+ pending)
-- Required by: qa-admin-04-advertisers-segments.yaml
INSERT INTO public.promotions (
  property_id, business_name, headline,
  review_status, payment_status, created_at
)
SELECT
  prof.property_ids[1],
  'QA Pending Promo ' || n,
  'E2E Test Promotion ' || n || ' — safe to delete',
  'pending',
  'unpaid',
  NOW() - (n || ' minutes')::interval
FROM public.profiles prof
CROSS JOIN generate_series(1, 4) AS n
WHERE prof.email = 'david@cultrhealth.com'
  AND prof.property_ids IS NOT NULL
  AND array_length(prof.property_ids, 1) > 0
ON CONFLICT DO NOTHING;

-- ── 6. Verify seed data ───────────────────────────────────────────────────────
-- Run after seeding to confirm everything is in place:

-- Active tiers
SELECT name, duration_days, price_cents, is_active, is_featured
FROM public.promotion_pricing_tiers
WHERE is_active = true
ORDER BY duration_days;

-- Unread notifications for tenant1
SELECT n.title, n.type, n.read, n.created_at
FROM public.notifications n
JOIN public.profiles p ON p.id = n.user_id
WHERE p.email = 'tenant1@unit-test.com' AND n.read = false
ORDER BY n.created_at DESC LIMIT 5;

-- Pending promotions for admin review (need 4+ for qa-admin-05)
SELECT p.headline, p.review_status, p.advertiser_id, p.created_at
FROM public.promotions p
JOIN public.profiles prof ON prof.email = 'david@cultrhealth.com'
WHERE p.property_id = prof.property_ids[1]
  AND p.review_status = 'pending'
ORDER BY p.created_at DESC;

-- Approved promo with CTA (for qa-promotions-01, qa-promotion-detail-01)
SELECT p.headline, p.review_status, p.advertiser_id, p.cta_text, p.cta_link
FROM public.promotions p
JOIN public.profiles prof ON prof.email = 'tenant1@unit-test.com'
WHERE p.property_id = prof.property_ids[1]
  AND p.review_status = 'approved'
  AND p.cta_link IS NOT NULL
ORDER BY p.created_at DESC LIMIT 3;
