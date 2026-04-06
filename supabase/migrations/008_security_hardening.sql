-- Migration 008: Security Hardening
-- Fixes RLS vulnerabilities and mass assignment vectors identified in audit.

-- ============================================================
-- 1. Post Impersonation & Spoofing
-- ============================================================
DROP POLICY IF EXISTS "Users can create posts" ON posts;

CREATE POLICY "Users can create posts"
  ON posts FOR INSERT TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_email = auth.jwt()->>'email'
    )
  );

-- ============================================================
-- 2. Direct Inbox Spamming
-- ============================================================
-- Only Edge Functions (service_role) should create notifications.
DROP POLICY IF EXISTS "Users can create notifications" ON notifications;

-- ============================================================
-- 3. Mass Assignment on Recommendations
-- ============================================================
DROP POLICY IF EXISTS "Users can update recommendations" ON recommendations;

CREATE POLICY "Users can update recommendations"
  ON recommendations FOR UPDATE TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_email = auth.jwt()->>'email'
    )
    OR
    (is_landlord() AND property_id = ANY(landlord_property_ids()))
  );

-- ============================================================
-- 4. Missing RLS Write Policies for Landlords on Properties
-- ============================================================
CREATE POLICY "Landlords can create properties"
  ON properties FOR INSERT TO authenticated
  WITH CHECK (is_landlord());

CREATE POLICY "Landlords can update properties"
  ON properties FOR UPDATE TO authenticated
  USING (is_landlord() AND id = ANY(landlord_property_ids()));

-- ============================================================
-- 5. Prevent Unauthorized Property Migration & is_featured manipulation
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_business_mass_assignment()
RETURNS trigger AS $$
BEGIN
  -- Prevent changing property_id after creation
  IF NEW.property_id IS DISTINCT FROM OLD.property_id THEN
    RAISE EXCEPTION 'property_id cannot be changed once created';
  END IF;

  -- Prevent tenants from making themselves featured
  IF NEW.is_featured IS DISTINCT FROM OLD.is_featured THEN
    -- Only allow if the caller is a landlord
    IF NOT is_landlord() THEN
      RAISE EXCEPTION 'Only landlords can change is_featured status';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_business_updates ON businesses;
CREATE TRIGGER check_business_updates
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION prevent_business_mass_assignment();
