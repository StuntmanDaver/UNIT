-- Fix: Grant table-level privileges to authenticated role for all public tables.
-- The 20260407221500 migration only granted to service_role.
-- The mobile app uses the authenticated role (anon key + JWT), which was blocked
-- by 42501 "permission denied" even where RLS policies were correctly defined.
-- RLS policies still control which ROWS each user can access.

-- Read access for all tables the mobile app and portal need
GRANT SELECT ON public.properties TO authenticated;
GRANT SELECT ON public.businesses TO authenticated;
GRANT SELECT ON public.posts TO authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.recommendations TO authenticated;
GRANT SELECT ON public.units TO authenticated;
GRANT SELECT ON public.promotions TO authenticated;
GRANT SELECT ON public.ad_analytics TO authenticated;
GRANT SELECT ON public.advertiser_profiles TO authenticated;
GRANT SELECT ON public.promotion_payment_attempts TO authenticated;

-- Write access the mobile app needs
GRANT INSERT, UPDATE ON public.businesses TO authenticated;
GRANT INSERT ON public.posts TO authenticated;
GRANT UPDATE ON public.posts TO authenticated;
GRANT INSERT, UPDATE ON public.recommendations TO authenticated;
GRANT INSERT ON public.ad_analytics TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT INSERT, UPDATE ON public.advertiser_profiles TO authenticated;
