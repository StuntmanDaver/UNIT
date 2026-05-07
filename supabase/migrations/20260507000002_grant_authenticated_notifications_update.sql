-- Fix: tenant users could read their notifications, but mark-read actions
-- failed before RLS evaluation because authenticated lacked table-level UPDATE.
-- The existing RLS policy still restricts writes to user_id = auth.uid().

GRANT UPDATE ON public.notifications TO authenticated;
