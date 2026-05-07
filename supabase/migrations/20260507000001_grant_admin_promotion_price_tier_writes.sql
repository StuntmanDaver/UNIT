-- Fix: landlord admins could read promotion_price_tiers but could not create
-- or update tiers from the mobile admin screen. RLS already scopes writes to
-- is_landlord(), but PostgreSQL table privileges must also allow the attempted
-- operation before RLS policies are evaluated.

GRANT INSERT, UPDATE, DELETE ON public.promotion_price_tiers TO authenticated;
