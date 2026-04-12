-- Migration: M4 Monetization
-- Renames advertiser_promotions → promotions
-- Adds advertiser payment/review columns to promotions
-- Creates: advertiser_profiles, promotion_payment_attempts,
--          promotion_status_events, ad_analytics, stripe_webhook_events

BEGIN;

-- ================================================================
-- 1. Rename table
-- ================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'advertiser_promotions'
  ) THEN
    ALTER TABLE advertiser_promotions RENAME TO promotions;
  END IF;
END $$;

-- Rename the index that referenced the old table name (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_advertiser_promotions_property_status') THEN
    ALTER INDEX idx_advertiser_promotions_property_status RENAME TO idx_promotions_property_status;
  END IF;
END $$;

-- ================================================================
-- 2. Create advertiser_profiles FIRST — promotions.advertiser_id will FK to it
--    (Must precede the ALTER TABLE so the FK target exists)
-- ================================================================
CREATE TABLE IF NOT EXISTS advertiser_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  contact_email text NOT NULL,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ================================================================
-- 3. Add M4 columns to promotions (all nullable — safe for existing rows)
--    advertiser_id → advertiser_profiles (spec: FK → advertiser_profiles)
--    reviewed_by / refunded_by → profiles (spec: FK → profiles, admin)
-- ================================================================
ALTER TABLE promotions
  ADD COLUMN IF NOT EXISTS advertiser_id uuid REFERENCES advertiser_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_status text CHECK (
    payment_status IS NULL OR
    payment_status IN ('unpaid', 'paid', 'repayment_required', 'refunded')
  ),
  ADD COLUMN IF NOT EXISTS review_status text CHECK (
    review_status IS NULL OR
    review_status IN (
      'draft', 'pending', 'approved', 'revision_requested',
      'rejected', 'expired', 'suspended'
    )
  ),
  ADD COLUMN IF NOT EXISTS current_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS refund_reason text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_by uuid REFERENCES profiles(id);

-- ================================================================
-- 4. Backfill review_status from old approval_status column
--    All existing rows are admin-created → payment_status stays NULL
-- ================================================================
UPDATE promotions SET
  review_status = CASE
    WHEN approval_status = 'approved' THEN 'approved'
    WHEN approval_status = 'rejected' THEN 'rejected'
    ELSE 'pending'
  END
WHERE review_status IS NULL;

-- Make review_status NOT NULL now that it's populated
ALTER TABLE promotions
  ALTER COLUMN review_status SET NOT NULL,
  ALTER COLUMN review_status SET DEFAULT 'pending';

-- ================================================================
-- 5. promotion_payment_attempts (new)
-- ================================================================
CREATE TABLE IF NOT EXISTS promotion_payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  stripe_checkout_session_id text NOT NULL,
  stripe_payment_intent_id text,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'completed', 'failed', 'canceled', 'refunded')),
  attempt_type text NOT NULL DEFAULT 'initial'
    CHECK (attempt_type IN ('initial', 'repayment')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ================================================================
-- 6. promotion_status_events (new)
-- ================================================================
CREATE TABLE IF NOT EXISTS promotion_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  from_review_status text,
  to_review_status text NOT NULL,
  from_payment_status text,
  to_payment_status text,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_type text NOT NULL
    CHECK (actor_type IN ('admin', 'advertiser', 'system', 'webhook')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ================================================================
-- 7. ad_analytics (new)
-- ================================================================
CREATE TABLE IF NOT EXISTS ad_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view', 'tap')),
  tenant_id uuid NOT NULL REFERENCES auth.users(id),
  property_id uuid NOT NULL REFERENCES properties(id),
  session_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ================================================================
-- 8. stripe_webhook_events — idempotency guard (new)
-- ================================================================
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id text PRIMARY KEY,   -- Stripe event ID
  type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- ================================================================
-- 9. Indexes
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_promotions_advertiser
  ON promotions(advertiser_id, review_status, created_at);

CREATE INDEX IF NOT EXISTS idx_ad_analytics_promotion
  ON ad_analytics(promotion_id, created_at);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_promotion
  ON promotion_payment_attempts(promotion_id, created_at);

CREATE INDEX IF NOT EXISTS idx_status_events_promotion
  ON promotion_status_events(promotion_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_analytics_view_dedup
  ON ad_analytics(promotion_id, tenant_id, session_id)
  WHERE event_type = 'view';

CREATE INDEX IF NOT EXISTS idx_promotions_live
  ON promotions(review_status, start_date, end_date)
  WHERE review_status = 'approved';

CREATE INDEX IF NOT EXISTS idx_payment_attempts_completed
  ON promotion_payment_attempts(promotion_id, status)
  WHERE status = 'completed';

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_attempts_checkout_session
  ON promotion_payment_attempts(stripe_checkout_session_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_analytics_tap_dedup
  ON ad_analytics(promotion_id, tenant_id, session_id)
  WHERE event_type = 'tap';

-- ================================================================
-- 10. RLS for new tables
-- ================================================================
ALTER TABLE advertiser_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- advertiser_profiles
CREATE POLICY "Advertisers read own profile"
  ON advertiser_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Advertisers update own profile"
  ON advertiser_profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Advertisers insert own profile"
  ON advertiser_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins manage advertiser profiles"
  ON advertiser_profiles FOR ALL
  USING (is_landlord())
  WITH CHECK (is_landlord());

-- promotions: drop old policies (table was renamed from advertiser_promotions)
DROP POLICY IF EXISTS "Tenants read approved advertiser promotions" ON promotions;
DROP POLICY IF EXISTS "Admins manage advertiser promotions" ON promotions;

-- Tenant: read live promotions for their property
CREATE POLICY "Tenants read live promotions"
  ON promotions FOR SELECT
  USING (
    review_status = 'approved'
    AND start_date::date <= now()::date
    AND end_date::date > now()::date
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND property_id = ANY(property_ids)
    )
  );

-- Advertiser: read own promotions
CREATE POLICY "Advertisers read own promotions"
  ON promotions FOR SELECT
  USING (advertiser_id = auth.uid());

-- Advertiser: insert drafts
CREATE POLICY "Advertisers insert draft promotions"
  ON promotions FOR INSERT
  WITH CHECK (
    advertiser_id = auth.uid()
    AND review_status = 'draft'
    AND payment_status = 'unpaid'
  );

-- Advertiser: update own promotions only in editable states
CREATE POLICY "Advertisers update own promotions"
  ON promotions FOR UPDATE
  USING (
    advertiser_id = auth.uid()
    AND review_status IN ('draft', 'revision_requested')
  )
  WITH CHECK (
    advertiser_id = auth.uid()
    AND review_status IN ('draft', 'revision_requested')
  );

-- Admin: manage all promotions
CREATE POLICY "Admins manage all promotions"
  ON promotions FOR ALL
  USING (is_landlord())
  WITH CHECK (is_landlord());

-- promotion_payment_attempts
CREATE POLICY "Advertisers view own payment attempts"
  ON promotion_payment_attempts FOR SELECT
  USING (
    promotion_id IN (
      SELECT id FROM promotions WHERE advertiser_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage payment attempts"
  ON promotion_payment_attempts FOR ALL
  USING (is_landlord())
  WITH CHECK (is_landlord());

-- promotion_status_events
CREATE POLICY "Advertisers view own status events"
  ON promotion_status_events FOR SELECT
  USING (
    promotion_id IN (
      SELECT id FROM promotions WHERE advertiser_id = auth.uid()
    )
  );

CREATE POLICY "Admins insert and read status events"
  ON promotion_status_events FOR ALL
  USING (is_landlord())
  WITH CHECK (is_landlord());

-- ad_analytics
CREATE POLICY "Tenants insert own analytics"
  ON ad_analytics FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Advertisers view analytics for own promotions"
  ON ad_analytics FOR SELECT
  USING (
    promotion_id IN (
      SELECT id FROM promotions WHERE advertiser_id = auth.uid()
    )
  );

CREATE POLICY "Admins view all analytics"
  ON ad_analytics FOR SELECT
  USING (is_landlord());

-- stripe_webhook_events: service role only (no user-facing access needed)
-- No policies — only service role key (Edge Functions) writes/reads this table.

COMMIT;
