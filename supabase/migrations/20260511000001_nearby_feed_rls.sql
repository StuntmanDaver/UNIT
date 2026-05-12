-- Allow active tenants to read public feed content from geocoded properties
-- within the Home Nearby radius.

BEGIN;

CREATE OR REPLACE FUNCTION public.is_nearby_active_property_member(
  target_property_id uuid,
  radius_miles double precision DEFAULT 20
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH caller_properties AS (
    SELECT own_property_id.property_id
    FROM profiles
    CROSS JOIN LATERAL unnest(profiles.property_ids) AS own_property_id(property_id)
    WHERE profiles.id = auth.uid()
      AND profiles.status = 'active'
  ),
  target_property AS (
    SELECT id, latitude, longitude
    FROM properties
    WHERE id = target_property_id
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
  )
  SELECT EXISTS (
    SELECT 1
    FROM caller_properties
    JOIN properties AS origin_property
      ON origin_property.id = caller_properties.property_id
     AND origin_property.latitude IS NOT NULL
     AND origin_property.longitude IS NOT NULL
    CROSS JOIN target_property
    WHERE target_property.id <> origin_property.id
      AND (
        3958.7613 * 2 * asin(
          sqrt(
            power(sin(radians(target_property.latitude - origin_property.latitude) / 2), 2)
            + cos(radians(origin_property.latitude))
            * cos(radians(target_property.latitude))
            * power(sin(radians(target_property.longitude - origin_property.longitude) / 2), 2)
          )
        )
      ) <= radius_miles
  );
$$;

DROP POLICY IF EXISTS "Businesses readable by active members landlords and owner" ON businesses;
CREATE POLICY "Businesses readable by active nearby members landlords and owner"
  ON businesses FOR SELECT TO authenticated
  USING (
    is_active_property_member(property_id)
    OR is_nearby_active_property_member(property_id)
    OR is_property_landlord(property_id)
    OR owner_email = auth.jwt()->>'email'
  );

DROP POLICY IF EXISTS "Posts readable by active members and landlords" ON posts;
CREATE POLICY "Posts readable by active nearby members and landlords"
  ON posts FOR SELECT TO authenticated
  USING (
    is_active_property_member(property_id)
    OR is_nearby_active_property_member(property_id)
    OR is_property_landlord(property_id)
  );

DROP POLICY IF EXISTS "Tenants read live promotions" ON promotions;
CREATE POLICY "Tenants read live nearby promotions"
  ON promotions FOR SELECT TO authenticated
  USING (
    review_status = 'approved'
    AND start_date::date <= now()::date
    AND end_date::date > now()::date
    AND (
      is_active_property_member(property_id)
      OR is_nearby_active_property_member(property_id)
    )
  );

COMMIT;
