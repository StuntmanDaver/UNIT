-- Grant UPDATE on promotions to the `authenticated` Postgres role.
--
-- The `Admins manage all promotions` RLS policy already restricts the row
-- scope to landlords via `is_landlord()`. Without this GRANT, however, a
-- logged-in admin's UPDATE call from the mobile client (PostgREST request as
-- the `authenticated` role) errors with `permission denied for table
-- promotions` *before* RLS evaluation, breaking the admin promotion review
-- flow (qa-admin-05: Approve / Suspend / Reinstate, etc.).
--
-- RLS still authorizes the row-by-row decision; the GRANT only opens the
-- table-level capability so the policy gets a chance to run.

GRANT UPDATE ON public.promotions TO authenticated;
