-- Backfill admin approval events for approved external promotions.
--
-- Admin-authored external promotions are inserted directly as approved. The
-- mobile admin create path now writes this event at creation time; this
-- migration repairs any existing rows so portal, mobile, and audit surfaces
-- agree on the same promotion status history.

BEGIN;

INSERT INTO promotion_status_events (
  promotion_id,
  from_review_status,
  to_review_status,
  from_payment_status,
  to_payment_status,
  actor_user_id,
  actor_type,
  note
)
SELECT
  p.id,
  NULL,
  'approved',
  p.payment_status,
  p.payment_status,
  p.created_by_admin_id,
  'admin',
  'Backfilled approval event for admin-created external promotion.'
FROM promotions p
WHERE p.advertiser_id IS NULL
  AND p.review_status = 'approved'
  AND p.created_by_admin_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM promotion_status_events pse
    WHERE pse.promotion_id = p.id
      AND pse.to_review_status = 'approved'
      AND pse.actor_type = 'admin'
  );

COMMIT;
