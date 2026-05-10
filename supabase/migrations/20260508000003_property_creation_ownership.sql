-- Bind landlord self-assignment to the authenticated user who created the property.

BEGIN;

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS created_by_landlord_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE properties
  ALTER COLUMN created_by_landlord_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "Landlords can create properties" ON properties;
CREATE POLICY "Landlords can create properties"
  ON properties FOR INSERT TO authenticated
  WITH CHECK (
    is_landlord()
    AND created_by_landlord_id = auth.uid()
  );

COMMIT;
