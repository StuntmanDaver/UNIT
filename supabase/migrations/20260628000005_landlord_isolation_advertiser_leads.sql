-- Multi-landlord isolation: independent property owners must not read or manage
-- each other's advertiser PII or lead pipeline.
--
-- BEFORE: advertiser_profiles and promotion_leads were gated on bare
-- `is_landlord()`, so ANY landlord could read every advertiser's
-- stripe_customer_id / contact_email and every prospect lead across all
-- properties. These tables have no property_id of their own, so we scope them
-- through their property linkage:
--   * advertiser_profiles.id = promotions.advertiser_id → promotions.property_id
--   * promotion_leads.target_property_ids (uuid[]) overlaps the landlord's
--     property_ids.
--
-- NOTE (architectural limitation, see docs/security/store-release-hardening-followups.md):
-- advertiser_profiles.status is a single GLOBAL field. This migration controls
-- WHO can read/flip it (only a landlord with a property-linked promotion), but
-- the EFFECT of a suspend still spans every property until advertiser status is
-- modeled per-property. Pricing (promotion_price_tiers) and audit_log remain
-- global and are tracked as separate data-model decisions.

-- ---------------------------------------------------------------------------
-- advertiser_profiles
-- ---------------------------------------------------------------------------

-- Advertisers may always read their own profile (portal self-views also use the
-- service-role client, but this makes RLS self-access explicit and safe).
DROP POLICY IF EXISTS "Advertisers read own profile" ON advertiser_profiles;
CREATE POLICY "Advertisers read own profile"
  ON advertiser_profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Landlords may read/manage an advertiser only if that advertiser has run a
-- promotion in one of the landlord's own properties.
DROP POLICY IF EXISTS "Admins manage advertiser profiles" ON advertiser_profiles;
DROP POLICY IF EXISTS "Property landlords manage linked advertiser profiles" ON advertiser_profiles;
CREATE POLICY "Property landlords manage linked advertiser profiles"
  ON advertiser_profiles FOR ALL TO authenticated
  USING (
    is_landlord()
    AND EXISTS (
      SELECT 1 FROM promotions p
      WHERE p.advertiser_id = advertiser_profiles.id
        AND public.is_property_landlord(p.property_id)
    )
  )
  WITH CHECK (
    is_landlord()
    AND EXISTS (
      SELECT 1 FROM promotions p
      WHERE p.advertiser_id = advertiser_profiles.id
        AND public.is_property_landlord(p.property_id)
    )
  );

-- ---------------------------------------------------------------------------
-- promotion_leads
-- ---------------------------------------------------------------------------

-- Landlords may read/manage only leads that target one of their properties.
-- The lead owner (creator) keeps access to their own rows.
DROP POLICY IF EXISTS "Admins manage promotion leads" ON promotion_leads;
DROP POLICY IF EXISTS "Property landlords manage scoped promotion leads" ON promotion_leads;
CREATE POLICY "Property landlords manage scoped promotion leads"
  ON promotion_leads FOR ALL TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR (is_landlord() AND target_property_ids && public.landlord_property_ids())
  )
  WITH CHECK (
    is_landlord() AND target_property_ids && public.landlord_property_ids()
  );
