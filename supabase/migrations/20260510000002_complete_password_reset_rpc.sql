-- Allow an authenticated user to clear their own forced password-reset flag
-- after Supabase Auth accepts the new password.

CREATE OR REPLACE FUNCTION public.complete_password_reset()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.profiles
  SET needs_password_change = false
  WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.complete_password_reset() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_password_reset() TO authenticated;
