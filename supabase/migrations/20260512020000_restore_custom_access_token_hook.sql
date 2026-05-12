-- Restore the auth custom access token hook target used by
-- public.dashboard_custom_access_token_hook. The app currently derives role,
-- property membership, and password-reset state from public.profiles after
-- sign-in, so the safest production behavior is to issue the token unchanged.

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN event;
END;
$$;

REVOKE ALL ON FUNCTION app.custom_access_token_hook(jsonb) FROM PUBLIC;
GRANT USAGE ON SCHEMA app TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION app.custom_access_token_hook(jsonb) TO supabase_auth_admin;
