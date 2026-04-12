-- 007_m2_schema_fixes.sql
-- Fixes schema gaps discovered during M1 audit

-- 1. Add data column to notifications for structured metadata (deep link targets, etc.)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data jsonb;

-- 2. Add type constraint to posts table (was missing — any string accepted)
-- First clean up any invalid types if they exist
UPDATE posts SET type = 'announcement' WHERE type NOT IN ('announcement', 'event', 'offer');

ALTER TABLE posts ADD CONSTRAINT check_post_type
  CHECK (type IN ('announcement', 'event', 'offer'));
