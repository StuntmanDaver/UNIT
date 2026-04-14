-- Fix: Grant SELECT on profiles to authenticated role
-- The mobile app uses the anon/authenticated role, which was missing
-- table-level privilege on profiles (only service_role had it).
-- RLS policy "Users can read own profile" already restricts rows correctly.

GRANT SELECT ON public.profiles TO authenticated;
