-- Google Play compliance support:
-- - Android Play Billing product IDs and purchase audit fields
-- - User terms acceptance
-- - Content/business reporting and business blocking

BEGIN;

ALTER TABLE promotion_price_tiers
  ADD COLUMN IF NOT EXISTS google_play_product_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_promotion_price_tiers_google_play_product
  ON promotion_price_tiers(google_play_product_id)
  WHERE google_play_product_id IS NOT NULL;

ALTER TABLE promotion_payment_attempts
  ALTER COLUMN stripe_checkout_session_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'stripe'
    CHECK (payment_provider IN ('stripe', 'google_play')),
  ADD COLUMN IF NOT EXISTS google_play_product_id text,
  ADD COLUMN IF NOT EXISTS google_play_purchase_token text,
  ADD COLUMN IF NOT EXISTS google_play_order_id text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_attempts_google_play_token
  ON promotion_payment_attempts(google_play_purchase_token)
  WHERE google_play_purchase_token IS NOT NULL;

ALTER TABLE promotion_payment_attempts
  DROP CONSTRAINT IF EXISTS promotion_payment_attempts_provider_reference_chk;

ALTER TABLE promotion_payment_attempts
  ADD CONSTRAINT promotion_payment_attempts_provider_reference_chk
  CHECK (
    (payment_provider = 'stripe' AND stripe_checkout_session_id IS NOT NULL)
    OR
    (payment_provider = 'google_play' AND google_play_purchase_token IS NOT NULL)
  );

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS accepted_terms_version text,
  ADD COLUMN IF NOT EXISTS accepted_terms_at timestamptz;

CREATE TABLE IF NOT EXISTS content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('post', 'business', 'promotion')),
  target_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam', 'harassment', 'misleading', 'inappropriate', 'other')),
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  resolution_note text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_reports_property_status
  ON content_reports(property_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_reports_target
  ON content_reports(target_type, target_id);

ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create reports for their properties"
  ON content_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reporter_user_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND content_reports.property_id = ANY(profiles.property_ids)
    )
  );

CREATE POLICY "Users read own reports"
  ON content_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_user_id);

CREATE POLICY "Admins manage property reports"
  ON content_reports FOR ALL
  TO authenticated
  USING (is_landlord() AND property_id = ANY(landlord_property_ids()))
  WITH CHECK (is_landlord() AND property_id = ANY(landlord_property_ids()));

CREATE TABLE IF NOT EXISTS user_business_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_user_business_blocks_user_property
  ON user_business_blocks(user_id, property_id);

ALTER TABLE user_business_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own business blocks"
  ON user_business_blocks FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND user_business_blocks.property_id = ANY(profiles.property_ids)
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.content_reports TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_business_blocks TO authenticated;

COMMIT;
