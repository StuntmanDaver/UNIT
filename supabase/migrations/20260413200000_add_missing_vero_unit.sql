-- Add missing Vero unit B5-789-3.
-- The original seed CSV had B5-789-2 duplicated; the second occurrence was a
-- data-entry error for B5-789-3. This migration inserts the missing unit
-- idempotently — safe to run multiple times.

DO $$
DECLARE
  v_property_id uuid;
BEGIN
  SELECT id INTO v_property_id
    FROM properties
   WHERE name = 'VD Vero, LLC'
   LIMIT 1;

  IF v_property_id IS NULL THEN
    RAISE NOTICE 'VD Vero, LLC property not found — skipping.';
    RETURN;
  END IF;

  INSERT INTO units (property_id, unit_number, street_address, city, state, zip, building)
  VALUES (v_property_id, 'B5-789-3', '789 8th COURT', 'Unit 3 VERO BEACH', 'FLORIDA', '32962', 'B5')
  ON CONFLICT (property_id, unit_number) DO NOTHING;
END $$;
