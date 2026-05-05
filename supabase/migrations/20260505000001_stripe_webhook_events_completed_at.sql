-- Migration: process-then-mark idempotency for stripe_webhook_events
--
-- Pre-existing pattern recorded the event id BEFORE running the handler.
-- If the handler then errored (DB hiccup, network blip, etc.), the event
-- was permanently marked "processed" while the side effects had only
-- partially or never run. Replays from Stripe were silently no-ops because
-- the duplicate-key error short-circuited the dedup check.
--
-- New pattern:
--   1. INSERT … ON CONFLICT DO NOTHING  → claim the event
--   2. SELECT completed_at              → if non-null, dedup return
--   3. Run handler                      → may throw, in which case we
--                                         leave completed_at NULL so a
--                                         retry from Stripe re-runs it
--   4. UPDATE … SET completed_at=now()  → mark fully processed
--
-- Backfill: existing rows are assumed to have been fully processed (they
-- were before this column existed) so we set completed_at = processed_at
-- for them. Only newly-inserted rows after this migration use the
-- two-phase mark.

BEGIN;

ALTER TABLE stripe_webhook_events
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

UPDATE stripe_webhook_events
   SET completed_at = processed_at
 WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_incomplete
  ON stripe_webhook_events(processed_at)
  WHERE completed_at IS NULL;

COMMIT;
