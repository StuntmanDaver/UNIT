-- Migration: Initiative 2 — Two-Path Promotions (admin-authored externals)
-- Source: customer feedback 2026-04-29, Engagement & UI Enhancement Initiatives
-- Allows admins to author promotions on behalf of external local businesses
-- (e.g. nearby Starbucks 10% off) WITHOUT requiring those businesses to
-- sign up as advertiser accounts. Customer doc: "the landlord/admin team
-- can manage the agreement externally and publish the ad from the admin
-- side." Approach (per plan #10): nullable advertiser_id + free-text
-- business fields, since promotions.business_name / headline / description
-- / image_url / cta_link / cta_text already exist as free-text columns.

BEGIN;

-- ================================================================
-- 1. Make advertiser_id nullable (defensive — may already be nullable)
--    Empty advertiser_id signals an admin-authored external promotion.
-- ================================================================
ALTER TABLE promotions ALTER COLUMN advertiser_id DROP NOT NULL;

-- ================================================================
-- 2. Track which admin authored an external (nullable; only set when
--    advertiser_id IS NULL). Tenant-side promotions stay unaffected.
-- ================================================================
ALTER TABLE promotions
  ADD COLUMN IF NOT EXISTS created_by_admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_contact_name text,
  ADD COLUMN IF NOT EXISTS external_contact_email text,
  ADD COLUMN IF NOT EXISTS external_contact_phone text;

-- ================================================================
-- 3. CHECK: every promotion must have either an advertiser_id
--    (advertiser-self-served) OR a business_name (admin-authored
--    external). This prevents blank/orphan rows.
-- ================================================================
ALTER TABLE promotions
  DROP CONSTRAINT IF EXISTS promotions_attribution_required;

ALTER TABLE promotions
  ADD CONSTRAINT promotions_attribution_required
    CHECK (
      advertiser_id IS NOT NULL
      OR (business_name IS NOT NULL AND length(trim(business_name)) > 0)
    );

-- ================================================================
-- 4. CHECK: if advertiser_id IS NULL (admin-authored external),
--    created_by_admin_id should be set so we can audit who published.
--    Allow nullable for backfill safety; enforce only on new INSERTs
--    via a separate policy/check at the application layer.
-- ================================================================
-- (No DB-level enforcement here — application layer (admin authoring
-- screen) sets created_by_admin_id on insert. A future migration can
-- harden this once backfill is verified.)

-- ================================================================
-- 5. Index for admin-authored externals (admin pipeline / V2 Kanban)
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_promotions_external
  ON promotions(property_id, review_status, start_date)
  WHERE advertiser_id IS NULL;

-- ================================================================
-- 6. RLS — no new policies needed.
--    Existing "Admins manage all promotions" (FOR ALL, is_landlord())
--    already permits admin INSERT/UPDATE on rows where advertiser_id
--    is NULL. Existing "Tenants read live promotions" already exposes
--    approved promotions to tenants on the property without checking
--    advertiser_id, so admin-authored externals surface correctly.
-- ================================================================

COMMIT;
