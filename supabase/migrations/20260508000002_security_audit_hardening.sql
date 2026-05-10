-- Security audit hardening: property-scoped RLS, tenant approval gates, and storage upload limits.

BEGIN;

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_active_property_member(target_property_id uuid)
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
      AND status = 'active'
      AND target_property_id = ANY(property_ids)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_invited_or_active_profile()
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
      AND status IN ('invited', 'active')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_property_landlord(target_property_id uuid)
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
      AND role = 'landlord'
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
      AND owner_email = auth.jwt()->>'email'
  );
$$;

CREATE OR REPLACE FUNCTION public.guard_profile_security_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  caller_is_landlord boolean;
BEGIN
  IF caller_id IS NULL THEN
    RETURN NEW;
  END IF;

  caller_is_landlord := EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = caller_id
      AND role = 'landlord'
      AND property_ids && OLD.property_ids
  );

  IF caller_id = OLD.id THEN
    IF NEW.id <> OLD.id
      OR NEW.role <> OLD.role
      OR NEW.property_ids IS DISTINCT FROM OLD.property_ids
      OR NEW.status <> OLD.status
      OR NEW.invited_at IS DISTINCT FROM OLD.invited_at
      OR NEW.activated_at IS DISTINCT FROM OLD.activated_at THEN
      RAISE EXCEPTION 'Profile security fields cannot be self-modified';
    END IF;
  ELSIF caller_is_landlord THEN
    IF NEW.id <> OLD.id
      OR NEW.role <> OLD.role
      OR NEW.property_ids IS DISTINCT FROM OLD.property_ids
      OR NEW.email IS DISTINCT FROM OLD.email
      OR NEW.push_token IS DISTINCT FROM OLD.push_token
      OR NEW.needs_password_change IS DISTINCT FROM OLD.needs_password_change
      OR NEW.display_name IS DISTINCT FROM OLD.display_name
      OR NEW.invited_at IS DISTINCT FROM OLD.invited_at
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Landlords may only update tenant status fields';
    END IF;
  ELSE
    RAISE EXCEPTION 'Profile update is not authorized';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_security_columns ON profiles;
CREATE TRIGGER guard_profile_security_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_security_columns();

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own mutable profile fields" ON profiles;
DROP POLICY IF EXISTS "Landlords can read assigned tenant profiles" ON profiles;
DROP POLICY IF EXISTS "Landlords can update assigned tenant status" ON profiles;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Landlords can read assigned tenant profiles"
  ON profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM unnest(profiles.property_ids) AS profile_property_id(property_id)
      WHERE public.is_property_landlord(profile_property_id.property_id)
    )
  );

CREATE POLICY "Users can update own mutable profile fields"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Landlords can update assigned tenant status"
  ON profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM unnest(profiles.property_ids) AS profile_property_id(property_id)
      WHERE public.is_property_landlord(profile_property_id.property_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM unnest(profiles.property_ids) AS profile_property_id(property_id)
      WHERE public.is_property_landlord(profile_property_id.property_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Core tenant tables
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Properties are viewable by authenticated users" ON properties;
DROP POLICY IF EXISTS "Landlords can update properties" ON properties;
DROP POLICY IF EXISTS "Landlords can create properties" ON properties;
CREATE POLICY "Authenticated users can list properties"
  ON properties FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Landlords can create properties"
  ON properties FOR INSERT TO authenticated
  WITH CHECK (is_landlord());
CREATE POLICY "Landlords can update assigned properties"
  ON properties FOR UPDATE TO authenticated
  USING (is_property_landlord(id))
  WITH CHECK (is_property_landlord(id));

DROP POLICY IF EXISTS "Businesses are viewable by authenticated users" ON businesses;
DROP POLICY IF EXISTS "Users can create businesses" ON businesses;
DROP POLICY IF EXISTS "Users can update own businesses" ON businesses;
CREATE POLICY "Businesses readable by active members landlords and owner"
  ON businesses FOR SELECT TO authenticated
  USING (
    is_active_property_member(property_id)
    OR is_property_landlord(property_id)
    OR owner_email = auth.jwt()->>'email'
  );
CREATE POLICY "Tenants can create own pending business claim"
  ON businesses FOR INSERT TO authenticated
  WITH CHECK (
    owner_email = auth.jwt()->>'email'
    AND is_invited_or_active_profile()
  );
CREATE POLICY "Owners and landlords update scoped businesses"
  ON businesses FOR UPDATE TO authenticated
  USING (
    (owner_email = auth.jwt()->>'email' AND is_active_property_member(property_id))
    OR is_property_landlord(property_id)
  )
  WITH CHECK (
    (owner_email = auth.jwt()->>'email' AND is_active_property_member(property_id))
    OR is_property_landlord(property_id)
  );

DROP POLICY IF EXISTS "Posts are viewable by authenticated users" ON posts;
DROP POLICY IF EXISTS "Users can create posts" ON posts;
CREATE POLICY "Posts readable by active members and landlords"
  ON posts FOR SELECT TO authenticated
  USING (is_active_property_member(property_id) OR is_property_landlord(property_id));
CREATE POLICY "Business owners create scoped posts"
  ON posts FOR INSERT TO authenticated
  WITH CHECK (
    is_active_property_member(property_id)
    AND is_business_owner_for_property(business_id, property_id)
  );

DROP POLICY IF EXISTS "Recommendations are viewable by authenticated users" ON recommendations;
DROP POLICY IF EXISTS "Users can create recommendations" ON recommendations;
DROP POLICY IF EXISTS "Users can update recommendations" ON recommendations;
CREATE POLICY "Recommendations readable by active members and landlords"
  ON recommendations FOR SELECT TO authenticated
  USING (is_active_property_member(property_id) OR is_property_landlord(property_id));
CREATE POLICY "Active members create recommendations"
  ON recommendations FOR INSERT TO authenticated
  WITH CHECK (
    is_active_property_member(property_id)
    AND (
      business_id IS NULL
      OR is_business_owner_for_property(business_id, property_id)
    )
  );
CREATE POLICY "Owners and landlords update scoped recommendations"
  ON recommendations FOR UPDATE TO authenticated
  USING (
    is_property_landlord(property_id)
    OR (
      is_active_property_member(property_id)
      AND business_id IS NOT NULL
      AND is_business_owner_for_property(business_id, property_id)
    )
  )
  WITH CHECK (
    is_property_landlord(property_id)
    OR (
      is_active_property_member(property_id)
      AND business_id IS NOT NULL
      AND is_business_owner_for_property(business_id, property_id)
    )
  );

DROP POLICY IF EXISTS "Ads are viewable by authenticated users" ON ads;
CREATE POLICY "Ads readable by active members and landlords"
  ON ads FOR SELECT TO authenticated
  USING (is_active_property_member(property_id) OR is_property_landlord(property_id));

DROP POLICY IF EXISTS "Units are viewable by authenticated users" ON units;
DROP POLICY IF EXISTS "Units are writable by authenticated users" ON units;
DROP POLICY IF EXISTS "Units are updatable by authenticated users" ON units;
DROP POLICY IF EXISTS "Units are deletable by authenticated users" ON units;
CREATE POLICY "Units readable by active members and landlords"
  ON units FOR SELECT TO authenticated
  USING (is_active_property_member(property_id) OR is_property_landlord(property_id));
CREATE POLICY "Landlords create assigned units"
  ON units FOR INSERT TO authenticated
  WITH CHECK (is_property_landlord(property_id));
CREATE POLICY "Landlords update assigned units"
  ON units FOR UPDATE TO authenticated
  USING (is_property_landlord(property_id))
  WITH CHECK (is_property_landlord(property_id));
CREATE POLICY "Landlords delete assigned units"
  ON units FOR DELETE TO authenticated
  USING (is_property_landlord(property_id));

-- ---------------------------------------------------------------------------
-- Monetization tables
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Tenants read live promotions" ON promotions;
CREATE POLICY "Tenants read live promotions"
  ON promotions FOR SELECT TO authenticated
  USING (
    review_status = 'approved'
    AND start_date::date <= now()::date
    AND end_date::date > now()::date
    AND is_active_property_member(property_id)
  );

DROP POLICY IF EXISTS "Advertisers insert draft promotions" ON promotions;
CREATE POLICY "Advertisers insert draft promotions"
  ON promotions FOR INSERT TO authenticated
  WITH CHECK (
    advertiser_id = auth.uid()
    AND review_status = 'draft'
    AND payment_status = 'unpaid'
    AND is_active_property_member(property_id)
  );

DROP POLICY IF EXISTS "Admins manage all promotions" ON promotions;
CREATE POLICY "Admins manage assigned promotions"
  ON promotions FOR ALL TO authenticated
  USING (is_property_landlord(property_id))
  WITH CHECK (is_property_landlord(property_id));

DROP POLICY IF EXISTS "Admins manage advertiser profiles" ON advertiser_profiles;
CREATE POLICY "Admins manage advertiser profiles"
  ON advertiser_profiles FOR ALL TO authenticated
  USING (is_landlord())
  WITH CHECK (is_landlord());

DROP POLICY IF EXISTS "Admins manage payment attempts" ON promotion_payment_attempts;
CREATE POLICY "Admins manage assigned payment attempts"
  ON promotion_payment_attempts FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM promotions
      WHERE promotions.id = promotion_payment_attempts.promotion_id
        AND is_property_landlord(promotions.property_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM promotions
      WHERE promotions.id = promotion_payment_attempts.promotion_id
        AND is_property_landlord(promotions.property_id)
    )
  );

DROP POLICY IF EXISTS "Admins insert and read status events" ON promotion_status_events;
CREATE POLICY "Admins manage assigned status events"
  ON promotion_status_events FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM promotions
      WHERE promotions.id = promotion_status_events.promotion_id
        AND is_property_landlord(promotions.property_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM promotions
      WHERE promotions.id = promotion_status_events.promotion_id
        AND is_property_landlord(promotions.property_id)
    )
  );

DROP POLICY IF EXISTS "Tenants insert own analytics" ON ad_analytics;
CREATE POLICY "Tenants insert own scoped analytics"
  ON ad_analytics FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM promotions
      WHERE promotions.id = ad_analytics.promotion_id
        AND is_active_property_member(promotions.property_id)
    )
  );

DROP POLICY IF EXISTS "Admins view all analytics" ON ad_analytics;
CREATE POLICY "Admins view assigned analytics"
  ON ad_analytics FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM promotions
      WHERE promotions.id = ad_analytics.promotion_id
        AND is_property_landlord(promotions.property_id)
    )
  );

DROP POLICY IF EXISTS "Admins manage promotion leads" ON promotion_leads;
CREATE POLICY "Admins manage assigned promotion leads"
  ON promotion_leads FOR ALL TO authenticated
  USING (
    is_landlord()
    AND (
      target_property_ids = '{}'
      OR EXISTS (
        SELECT 1 FROM unnest(target_property_ids) AS target_property_id
        WHERE is_property_landlord(target_property_id)
      )
    )
  )
  WITH CHECK (
    is_landlord()
    AND (
      target_property_ids = '{}'
      OR EXISTS (
        SELECT 1 FROM unnest(target_property_ids) AS target_property_id
        WHERE is_property_landlord(target_property_id)
      )
    )
  );

DROP POLICY IF EXISTS "Tenants read groups for own properties" ON property_groups;
CREATE POLICY "Active tenants read groups for own properties"
  ON property_groups FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM property_group_members pgm
      WHERE pgm.group_id = property_groups.id
        AND is_active_property_member(pgm.property_id)
    )
  );

DROP POLICY IF EXISTS "Admins manage property groups" ON property_groups;
CREATE POLICY "Landlords manage property groups"
  ON property_groups FOR ALL TO authenticated
  USING (is_landlord())
  WITH CHECK (is_landlord());

DROP POLICY IF EXISTS "Tenants read membership for own groups" ON property_group_members;
CREATE POLICY "Active tenants read membership for own groups"
  ON property_group_members FOR SELECT TO authenticated
  USING (
    is_active_property_member(property_id)
    OR EXISTS (
      SELECT 1
      FROM property_group_members own
      WHERE own.group_id = property_group_members.group_id
        AND is_active_property_member(own.property_id)
    )
  );

DROP POLICY IF EXISTS "Admins manage property group members" ON property_group_members;
CREATE POLICY "Landlords manage property group members"
  ON property_group_members FOR ALL TO authenticated
  USING (is_landlord())
  WITH CHECK (is_landlord());

-- ---------------------------------------------------------------------------
-- Public asset uploads
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public read public-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated image uploads to own prefix" ON storage.objects;

CREATE POLICY "Public read public-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'public-assets');

CREATE POLICY "Authenticated image uploads to own prefix"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'public-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
    AND coalesce(nullif(metadata->>'size', '')::bigint, 0) <= 5242880
  );

COMMIT;
