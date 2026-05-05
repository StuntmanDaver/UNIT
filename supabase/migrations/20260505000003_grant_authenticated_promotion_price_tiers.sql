-- Fix: tenant reads of promotion_price_tiers hit 42501 "permission denied"
-- because 20260502000002_promotion_price_tiers.sql created the table and
-- defined RLS policies but never granted SELECT to the authenticated role,
-- and the global grants migration 20260413000002 predated the table so it
-- did not pick it up.
--
-- The pending-payment screen renders "No tiers available." in this state
-- because the SELECT throws and React Query returns no data. Granting
-- SELECT to authenticated unblocks the existing RLS policy
-- ("Tenants read active price tiers") which constrains rows to
-- is_active = true.
--
-- Admin writes (INSERT / UPDATE / DELETE via the "Admins manage price
-- tiers" policy) are intentionally NOT granted here — those operations
-- happen through the service-role-backed admin tools, and broadening
-- write access for every authenticated user would defeat that boundary.

GRANT SELECT ON public.promotion_price_tiers TO authenticated;
