-- Migration 006: Mobile MVP extensions
-- Extends profiles for mobile onboarding and push notifications
-- Creates advertiser_promotions table for local business promotions

-- 1. Extend profiles for mobile onboarding and push notifications
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_token text,
  ADD COLUMN IF NOT EXISTS needs_password_change boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'
    CHECK (status IN ('invited', 'active', 'inactive'));

-- Set existing profiles to 'active' status (they're already active users)
UPDATE profiles SET status = 'active' WHERE status IS NULL;

-- 2. Advertiser promotions table
CREATE TABLE IF NOT EXISTS advertiser_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  business_name text NOT NULL,
  business_type text,
  contact_email text,
  contact_phone text,
  headline text NOT NULL,
  description text,
  image_url text,
  cta_link text,
  cta_text text,
  approval_status text DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES auth.users(id),
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now()
);

-- 3. RLS for advertiser_promotions
ALTER TABLE advertiser_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants read approved advertiser promotions"
  ON advertiser_promotions FOR SELECT
  USING (approval_status = 'approved');

CREATE POLICY "Admins manage advertiser promotions"
  ON advertiser_promotions FOR ALL
  USING (is_landlord() AND property_id = ANY(landlord_property_ids()));

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_push_token
  ON profiles(push_token) WHERE push_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_advertiser_promotions_property_status
  ON advertiser_promotions(property_id, approval_status);

-- 5. Update the auto-profile trigger to set status = 'active' for self-registering users
-- (invited users get status = 'invited' set by the invite-tenant Edge Function)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, property_ids, email, status, activated_at)
  VALUES (new.id, 'tenant', '{}', new.email, 'active', now())
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
