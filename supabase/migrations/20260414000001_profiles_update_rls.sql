-- Migration: Add RLS UPDATE policy for profiles (T-02-02 security gate)
--
-- Problem: profiles table has RLS enabled but no UPDATE policy for the
-- authenticated role. profilesService.update() uses the authenticated client,
-- so reset-password and profile-edit updates silently fail (implicit DENY).
--
-- Fix: Allow authenticated users to update their own mutable fields.
-- WITH CHECK blocks self-elevation of role and property_ids — those columns
-- must stay identical to their pre-update values, enforced at the DB level.

CREATE POLICY "Users can update own mutable profile fields"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Prevent self-elevation: role and property_ids must remain unchanged
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    AND property_ids = (SELECT property_ids FROM profiles WHERE id = auth.uid())
  );
