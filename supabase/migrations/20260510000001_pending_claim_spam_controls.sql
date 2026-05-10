-- Prevent repeated tenant self-signup claims from flooding landlord review queues.

BEGIN;

CREATE OR REPLACE FUNCTION public.guard_single_business_claim_per_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM businesses
    WHERE lower(owner_email) = lower(NEW.owner_email)
  ) THEN
    RAISE EXCEPTION 'A business claim already exists for this email'
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_single_business_claim_per_email ON businesses;
CREATE TRIGGER guard_single_business_claim_per_email
  BEFORE INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_single_business_claim_per_email();

DROP POLICY IF EXISTS "Tenants can create own pending business claim" ON businesses;
CREATE POLICY "Tenants can create own pending business claim"
  ON businesses FOR INSERT TO authenticated
  WITH CHECK (
    owner_email = auth.jwt()->>'email'
    AND is_invited_or_active_profile()
  );

COMMIT;
