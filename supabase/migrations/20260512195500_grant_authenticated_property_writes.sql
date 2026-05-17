-- Allow the mobile app's authenticated Supabase client to reach the
-- landlord-scoped property write RLS policies.
--
-- Without table-level privileges, PostgREST returns 42501 "permission denied"
-- before evaluating the existing "Landlords can create properties" and
-- "Landlords can update assigned properties" policies.

GRANT INSERT, UPDATE ON public.properties TO authenticated;
