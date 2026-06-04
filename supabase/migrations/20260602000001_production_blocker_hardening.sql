-- Production blocker hardening: tighten tenant-owned writes, business/unit
-- invariants, storage provisioning, and landlord property self-attachment.

BEGIN;

-- ---------------------------------------------------------------------------
-- Helper predicates
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_tenant_for_property(target_property_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND role = 'tenant'
      AND status = 'active'
      AND target_property_id = ANY(property_ids)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_business_owner_for_property(target_business_id uuid, target_property_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM businesses
    WHERE id = target_business_id
      AND property_id = target_property_id
      AND lower(owner_email) = lower(auth.jwt()->>'email')
  );
$$;

-- ---------------------------------------------------------------------------
-- Promotions: tenant writes must stay within profile.property_ids
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Advertisers insert draft promotions" ON promotions;
CREATE POLICY "Advertisers insert draft promotions"
  ON promotions FOR INSERT TO authenticated
  WITH CHECK (
    advertiser_id = auth.uid()
    AND review_status = 'draft'
    AND payment_status = 'unpaid'
    AND public.is_tenant_for_property(property_id)
  );

DROP POLICY IF EXISTS "Advertisers update own promotions" ON promotions;
CREATE POLICY "Advertisers update own promotions"
  ON promotions FOR UPDATE TO authenticated
  USING (
    advertiser_id = auth.uid()
    AND review_status IN ('draft', 'changes_requested')
    AND public.is_tenant_for_property(property_id)
  )
  WITH CHECK (
    advertiser_id = auth.uid()
    AND review_status IN ('draft', 'changes_requested')
    AND public.is_tenant_for_property(property_id)
  );

-- ---------------------------------------------------------------------------
-- Posts: property_id must match the owned business property
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Business owners create scoped posts" ON posts;
CREATE POLICY "Business owners create scoped posts"
  ON posts FOR INSERT TO authenticated
  WITH CHECK (
    public.is_tenant_for_property(property_id)
    AND public.is_business_owner_for_property(business_id, property_id)
  );

-- ---------------------------------------------------------------------------
-- Businesses: prevent tenant mass assignment of ownership/property/unit
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_business_security_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_email text := auth.jwt()->>'email';
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_property_landlord(OLD.property_id) THEN
    RETURN NEW;
  END IF;

  IF lower(OLD.owner_email) <> lower(caller_email) THEN
    RAISE EXCEPTION 'Business update is not authorized';
  END IF;

  IF NEW.owner_email IS DISTINCT FROM OLD.owner_email
    OR NEW.property_id IS DISTINCT FROM OLD.property_id
    OR NEW.unit_id IS DISTINCT FROM OLD.unit_id
    OR NEW.unit_number IS DISTINCT FROM OLD.unit_number THEN
    RAISE EXCEPTION 'Business ownership, property, and unit fields cannot be tenant-modified';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_business_security_columns ON businesses;
CREATE TRIGGER guard_business_security_columns
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_business_security_columns();

DROP POLICY IF EXISTS "Owners and landlords update scoped businesses" ON businesses;
CREATE POLICY "Owners and landlords update scoped businesses"
  ON businesses FOR UPDATE TO authenticated
  USING (
    (lower(owner_email) = lower(auth.jwt()->>'email') AND public.is_tenant_for_property(property_id))
    OR public.is_property_landlord(property_id)
  )
  WITH CHECK (
    (lower(owner_email) = lower(auth.jwt()->>'email') AND public.is_tenant_for_property(property_id))
    OR public.is_property_landlord(property_id)
  );

CREATE UNIQUE INDEX IF NOT EXISTS businesses_one_active_claim_per_property_unit
  ON businesses (property_id, lower(unit_number))
  WHERE unit_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS businesses_one_active_claim_per_unit_id
  ON businesses (unit_id)
  WHERE unit_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Storage: codify public-assets bucket and policies
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-assets',
  'public-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Public read public-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated image uploads to own prefix" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update own public-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete own public-assets" ON storage.objects;

CREATE POLICY "Public read public-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'public-assets');

CREATE POLICY "Authenticated image uploads to own prefix"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'public-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated update own public-assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'public-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'public-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated delete own public-assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'public-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Properties: attach newly created properties to the creating landlord
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.attach_created_property_to_landlord()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  landlord_id uuid := COALESCE(NEW.created_by_landlord_id, auth.uid());
BEGIN
  IF landlord_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE profiles
  SET property_ids = (
    SELECT ARRAY(
      SELECT DISTINCT property_id
      FROM unnest(COALESCE(profiles.property_ids, '{}') || NEW.id) AS property_id
    )
  )
  WHERE id = landlord_id
    AND role = 'landlord';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS attach_created_property_to_landlord ON properties;
CREATE TRIGGER attach_created_property_to_landlord
  AFTER INSERT ON properties
  FOR EACH ROW
  EXECUTE FUNCTION public.attach_created_property_to_landlord();

COMMIT;
