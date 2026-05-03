-- Migration: US-013 dependency (added during US-012) — Add price_tier_id to promotion_payment_attempts
-- Mobile-tenant checkout attempts now record which price tier was selected so
-- admins can see the tier in the payment audit trail. Nullable so the portal
-- advertiser flow (which pre-dates price tiers) remains unaffected.

BEGIN;

ALTER TABLE promotion_payment_attempts
  ADD COLUMN IF NOT EXISTS price_tier_id uuid
    REFERENCES promotion_price_tiers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payment_attempts_tier
  ON promotion_payment_attempts(price_tier_id)
  WHERE price_tier_id IS NOT NULL;

COMMIT;
