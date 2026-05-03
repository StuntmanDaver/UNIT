-- Migration: Initiative 4 — Property Clustering Schema
-- Source: customer feedback 2026-04-29, Engagement & UI Enhancement Initiatives
-- Adds geolocation columns to properties + a many-to-many group/cluster
-- system so geographically-clustered properties (e.g., Daytona Beach
-- assets within ~2 miles) can expose a "Nearby Properties" feed in
-- addition to the per-property feed. Grouping is opt-in / configurable
-- per property; un-grouped properties continue to behave as today.

BEGIN;

-- ================================================================
-- 1. Geolocation on properties (nullable — backfilled by admin or geocoding)
-- ================================================================
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- Range checks: valid lat ∈ [-90, 90], lon ∈ [-180, 180]
ALTER TABLE properties
  DROP CONSTRAINT IF EXISTS properties_latitude_range,
  DROP CONSTRAINT IF EXISTS properties_longitude_range;

ALTER TABLE properties
  ADD CONSTRAINT properties_latitude_range
    CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90)),
  ADD CONSTRAINT properties_longitude_range
    CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180));

-- ================================================================
-- 2. property_groups — named clusters (e.g. "Daytona Beach")
-- ================================================================
CREATE TABLE IF NOT EXISTS property_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_property_groups_name_unique
  ON property_groups (lower(name));

-- ================================================================
-- 3. property_group_members — many-to-many join
--    A property may belong to multiple groups (e.g. "Daytona Beach"
--    and "All Florida Properties"); a group has many properties.
-- ================================================================
CREATE TABLE IF NOT EXISTS property_group_members (
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES property_groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (property_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_property_group_members_group
  ON property_group_members(group_id);

-- ================================================================
-- 4. RLS
--    Tenants need to READ groups/membership for the property they
--    belong to (so the home-feed selector can show "Nearby" options).
--    Only landlords can mutate.
-- ================================================================
ALTER TABLE property_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_group_members ENABLE ROW LEVEL SECURITY;

-- property_groups: any authenticated user can read groups that contain
-- a property they belong to; admins can read all and mutate.
CREATE POLICY "Tenants read groups for own properties"
  ON property_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM property_group_members pgm
      JOIN profiles p ON p.id = auth.uid()
      WHERE pgm.group_id = property_groups.id
        AND pgm.property_id = ANY(p.property_ids)
    )
  );

CREATE POLICY "Admins manage property groups"
  ON property_groups FOR ALL
  USING (is_landlord())
  WITH CHECK (is_landlord());

-- property_group_members: tenants read membership rows for groups
-- that include one of their properties; admins manage.
CREATE POLICY "Tenants read membership for own groups"
  ON property_group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND property_group_members.property_id = ANY(p.property_ids)
    )
    OR EXISTS (
      -- Tenant can also see siblings: other properties in the same group
      -- as one of their own properties (so "Nearby" feed can list them).
      SELECT 1
      FROM property_group_members own
      JOIN profiles p ON p.id = auth.uid()
      WHERE own.group_id = property_group_members.group_id
        AND own.property_id = ANY(p.property_ids)
    )
  );

CREATE POLICY "Admins manage property group members"
  ON property_group_members FOR ALL
  USING (is_landlord())
  WITH CHECK (is_landlord());

COMMIT;
