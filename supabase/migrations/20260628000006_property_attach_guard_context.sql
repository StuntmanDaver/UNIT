-- Allow the landlord property-creation trigger to append the new property to
-- the creator's profile while keeping direct self-edits to profile security
-- fields blocked.
--
-- The attach trigger is SECURITY DEFINER, but auth.uid() still reflects the
-- original end-user. Without an internal marker, guard_profile_security_columns
-- treats the trigger's property_ids append as a landlord self-edit and raises
-- "Profile security fields cannot be self-modified".

CREATE OR REPLACE FUNCTION public.guard_profile_security_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  caller_is_landlord boolean;
  internal_property_attach boolean :=
    current_setting('unit.internal_property_attach', true) = 'true';
BEGIN
  IF caller_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF internal_property_attach
     AND caller_id = OLD.id
     AND NEW.id = OLD.id
     AND NEW.role = OLD.role
     AND NEW.email IS NOT DISTINCT FROM OLD.email
     AND NEW.status = OLD.status
     AND NEW.invited_at IS NOT DISTINCT FROM OLD.invited_at
     AND NEW.activated_at IS NOT DISTINCT FROM OLD.activated_at
     AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at THEN
    RETURN NEW;
  END IF;

  caller_is_landlord := EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = caller_id
      AND role = 'landlord'
      AND property_ids && OLD.property_ids
  );

  IF caller_id = OLD.id THEN
    IF NEW.id <> OLD.id
      OR NEW.role <> OLD.role
      OR NEW.property_ids IS DISTINCT FROM OLD.property_ids
      OR NEW.status <> OLD.status
      OR NEW.invited_at IS DISTINCT FROM OLD.invited_at
      OR NEW.activated_at IS DISTINCT FROM OLD.activated_at THEN
      RAISE EXCEPTION 'Profile security fields cannot be self-modified';
    END IF;
  ELSIF caller_is_landlord THEN
    IF NEW.id <> OLD.id
      OR NEW.role <> OLD.role
      OR NEW.property_ids IS DISTINCT FROM OLD.property_ids
      OR NEW.email IS DISTINCT FROM OLD.email
      OR NEW.push_token IS DISTINCT FROM OLD.push_token
      OR NEW.needs_password_change IS DISTINCT FROM OLD.needs_password_change
      OR NEW.display_name IS DISTINCT FROM OLD.display_name
      OR NEW.invited_at IS DISTINCT FROM OLD.invited_at
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Landlords may only update tenant status fields';
    END IF;
  ELSE
    RAISE EXCEPTION 'Profile update is not authorized';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_created_property_to_landlord()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  landlord_id uuid := COALESCE(NEW.created_by_landlord_id, auth.uid());
BEGIN
  IF landlord_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('unit.internal_property_attach', 'true', true);

  UPDATE profiles
  SET property_ids = (
    SELECT ARRAY(
      SELECT DISTINCT property_id
      FROM unnest(COALESCE(profiles.property_ids, '{}') || NEW.id) AS property_id
    )
  )
  WHERE id = landlord_id
    AND role = 'landlord';

  PERFORM set_config('unit.internal_property_attach', '', true);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('unit.internal_property_attach', '', true);
    RAISE;
END;
$$;
