-- Guard against advertiser/tenant tampering with billing + admin-review columns
-- on their OWN promotions via direct PostgREST UPDATEs.
--
-- WHY: the "Advertisers update own promotions" RLS policy
-- (20260602000001_production_blocker_hardening.sql:57-69) pins advertiser_id,
-- review_status, and property scope in its WITH CHECK, but does NOT pin
-- payment_status. The INSERT policy pins payment_status = 'unpaid', but the
-- UPDATE policy does not — so a tenant who owns a `draft` promotion could
--   UPDATE promotions SET payment_status = 'paid' WHERE id = '<own draft>'
-- (advertiser_id, review_status, and property all unchanged → WITH CHECK passes)
-- and skip Stripe checkout entirely. RLS WITH CHECK cannot reference OLD, so
-- column immutability is enforced with a BEFORE UPDATE trigger, mirroring
-- public.guard_business_security_columns.
--
-- WHO IS ALLOWED THROUGH:
--   * Service-role / Edge Function / pg_cron contexts (Stripe webhook,
--     issue-refund, expire-promotions) run with auth.uid() IS NULL → allowed.
--   * The property's landlord/admin (is_property_landlord) moderates and
--     manages promotions fully → allowed.
--   * Everyone else (advertisers/tenants) is blocked from changing the
--     billing-, ownership-, and admin-review-controlled columns.

CREATE OR REPLACE FUNCTION public.guard_promotion_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- No end-user JWT (service role / edge functions / cron): allow.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- The property's landlord/admin may moderate + manage promotions fully.
  IF public.is_property_landlord(OLD.property_id) THEN
    RETURN NEW;
  END IF;

  -- Advertisers/tenants must not touch billing-, ownership-, or
  -- admin-review-controlled columns on their own promotions.
  IF NEW.payment_status            IS DISTINCT FROM OLD.payment_status
     OR NEW.advertiser_id          IS DISTINCT FROM OLD.advertiser_id
     OR NEW.property_id            IS DISTINCT FROM OLD.property_id
     OR NEW.current_payment_intent_id IS DISTINCT FROM OLD.current_payment_intent_id
     OR NEW.reviewed_by            IS DISTINCT FROM OLD.reviewed_by
     OR NEW.reviewed_at            IS DISTINCT FROM OLD.reviewed_at
     OR NEW.review_note            IS DISTINCT FROM OLD.review_note
     OR NEW.refund_reason          IS DISTINCT FROM OLD.refund_reason
     OR NEW.refunded_at            IS DISTINCT FROM OLD.refunded_at
     OR NEW.refunded_by            IS DISTINCT FROM OLD.refunded_by THEN
    RAISE EXCEPTION 'Promotion billing and review fields cannot be modified by the advertiser';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_promotion_billing_columns ON public.promotions;
CREATE TRIGGER guard_promotion_billing_columns
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_promotion_billing_columns();
