-- Migration: US-011 — Promotion Price Tiers
-- Adds the promotion_price_tiers table so admins can configure pricing
-- for tenant-submitted promotions without a code change.
-- Tenants see active tiers when selecting a plan before checkout.

BEGIN;

-- ================================================================
-- 1. Price tiers table
--    price_cents stores the amount in USD cents (100 = $1.00).
--    currency defaults to 'usd' — extend for multi-currency later.
-- ================================================================
CREATE TABLE IF NOT EXISTS promotion_price_tiers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  duration_days integer NOT NULL CHECK (duration_days > 0),
  is_featured  boolean NOT NULL DEFAULT false,
  price_cents  integer NOT NULL CHECK (price_cents >= 0),
  currency     text NOT NULL DEFAULT 'usd',
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promotion_price_tiers_active
  ON promotion_price_tiers(is_active, price_cents ASC)
  WHERE is_active = true;

-- ================================================================
-- 2. Auto-update updated_at on row change
-- ================================================================
CREATE OR REPLACE FUNCTION promotion_price_tiers_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promotion_price_tiers_updated_at ON promotion_price_tiers;
CREATE TRIGGER trg_promotion_price_tiers_updated_at
  BEFORE UPDATE ON promotion_price_tiers
  FOR EACH ROW
  EXECUTE FUNCTION promotion_price_tiers_set_updated_at();

-- ================================================================
-- 3. RLS
--    Tenants: SELECT active tiers only (for the plan picker in checkout).
--    Admins: full access via is_landlord().
-- ================================================================
ALTER TABLE promotion_price_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants read active price tiers"
  ON promotion_price_tiers FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins manage price tiers"
  ON promotion_price_tiers FOR ALL
  TO authenticated
  USING (is_landlord())
  WITH CHECK (is_landlord());

-- ================================================================
-- 4. Seed two starter tiers
--    ON CONFLICT DO NOTHING makes the migration idempotent on re-run.
-- ================================================================
INSERT INTO promotion_price_tiers (name, duration_days, is_featured, price_cents)
VALUES
  ('7-day Standard',  7,  false, 2500),
  ('30-day Featured', 30, true,  9900)
ON CONFLICT DO NOTHING;

COMMIT;
