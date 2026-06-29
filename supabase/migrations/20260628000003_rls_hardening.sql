-- RLS / SECURITY DEFINER hardening — security audit 2026-06-28.
--
-- Items 1-3 are pure hardening (no behavior change to legitimate flows).
-- Item 4 closes a cross-property write: an active tenant of property A could
-- INSERT a business claim into property B. Invited-tenant first claims are
-- preserved — invite-tenant sets profile.property_ids = [property_id] and
-- status='invited' at invite time, so the new membership helper (which allows
-- status IN ('invited','active')) still admits a tenant's claim for their own
-- property while rejecting claims for properties they don't belong to.

BEGIN;

-- 1. Pin search_path on the legacy SECURITY DEFINER functions that still lack
--    it. ALTER does not touch the body, so there is no behavior change — this
--    only removes the mutable-search_path escalation surface.
ALTER FUNCTION public.is_landlord() SET search_path = public;
ALTER FUNCTION public.landlord_property_ids() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 2. Drop the superseded business-update guard. guard_business_security_columns
--    (20260602000001) already protects the security columns and is correctly
--    search_path-pinned; check_business_updates is the older, unpinned path that
--    was never removed and still fires in parallel.
DROP TRIGGER IF EXISTS check_business_updates ON businesses;
DROP FUNCTION IF EXISTS public.prevent_business_mass_assignment();

-- 3. notifications UPDATE: add WITH CHECK so a user cannot rewrite user_id and
--    reassign their own notification into another user's inbox.
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Property-scope the businesses INSERT claim.
CREATE OR REPLACE FUNCTION public.is_member_for_property(target_property_id uuid)
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
      AND target_property_id = ANY(property_ids)
  );
$$;

DROP POLICY IF EXISTS "Tenants can create own pending business claim" ON businesses;
CREATE POLICY "Tenants can create own pending business claim"
  ON businesses FOR INSERT TO authenticated
  WITH CHECK (
    owner_email = auth.jwt()->>'email'
    AND is_invited_or_active_profile()
    AND public.is_member_for_property(property_id)
  );

COMMIT;
