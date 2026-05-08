BEGIN;

ALTER TABLE promotions
  DROP CONSTRAINT IF EXISTS promotions_reviewed_by_fkey,
  ADD CONSTRAINT promotions_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE promotions
  DROP CONSTRAINT IF EXISTS promotions_refunded_by_fkey,
  ADD CONSTRAINT promotions_refunded_by_fkey
    FOREIGN KEY (refunded_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE ad_analytics
  DROP CONSTRAINT IF EXISTS ad_analytics_tenant_id_fkey,
  ADD CONSTRAINT ad_analytics_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES auth.users(id) ON DELETE CASCADE;

COMMIT;
