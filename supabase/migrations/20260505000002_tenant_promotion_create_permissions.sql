-- Fix: tenant-authored promotion creation hit 42501 "permission denied for
-- table promotions" because the grants migration 20260413000002 only added
-- SELECT on promotions for the authenticated role; the matching INSERT policy
-- from 20260412000001 was never reachable.
--
-- promotionsService.createTenant performs two inserts in sequence:
--   1) INSERT INTO promotions          (RLS policy exists; grant was missing)
--   2) INSERT INTO promotion_status_events  (no tenant grant; no tenant policy)
--
-- This migration unblocks both writes for the advertiser (tenant) path while
-- leaving the existing admin / service_role paths untouched.

-- 1. Table-level grants for the authenticated role
GRANT INSERT ON public.promotions TO authenticated;
GRANT INSERT ON public.promotion_status_events TO authenticated;

-- 2. Allow advertisers to write the audit event for promotions they own.
--    Mirrors the SELECT policy from 20260412000001 ("Advertisers view own
--    status events") and constrains the actor fields to prevent spoofing.
CREATE POLICY "Advertisers insert own status events"
  ON promotion_status_events FOR INSERT
  WITH CHECK (
    actor_user_id = auth.uid()
    AND actor_type = 'advertiser'
    AND promotion_id IN (
      SELECT id FROM promotions WHERE advertiser_id = auth.uid()
    )
  );
