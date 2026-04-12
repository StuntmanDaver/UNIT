-- Migration: Add user_id to notifications table
-- The notifications table previously identified users by email (text), which
-- orphans records on email change, prevents CASCADE DELETE from auth.users,
-- and is slower than UUID comparison on every query.
-- This migration adds user_id, backfills from auth.users, hardens RLS,
-- and updates the index.

-- 1. Add the column (nullable initially so existing rows don't violate constraint)
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Backfill: match existing notifications to auth.users by email
UPDATE notifications n
SET user_id = u.id
FROM auth.users u
WHERE n.user_email = u.email
  AND n.user_id IS NULL;

-- 3. Delete any notifications that couldn't be matched (orphaned by email mismatch).
--    These are unreachable by any living user anyway.
DELETE FROM notifications WHERE user_id IS NULL;

-- 4. Enforce NOT NULL now that all rows have a value
ALTER TABLE notifications ALTER COLUMN user_id SET NOT NULL;

-- 5. Drop the email-based RLS policies and replace with user_id-based ones
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- 6. Replace the old (user_email, property_id) index with a user_id-based one
DROP INDEX IF EXISTS idx_notifications_user_property;
CREATE INDEX idx_notifications_user_id_property
  ON notifications(user_id, property_id);
