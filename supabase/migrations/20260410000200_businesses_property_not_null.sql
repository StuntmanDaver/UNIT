-- Migration: Enforce NOT NULL on businesses.property_id
-- The initial schema left property_id nullable, but every app query
-- filters by property_id. A business without a property is an orphan
-- that breaks the directory, stats, and onboarding checks.

-- Remove any orphaned businesses that have no property (data cleanup).
-- In production this should be zero rows, but the constraint cannot be
-- added if any NULL values exist.
DELETE FROM businesses WHERE property_id IS NULL;

-- Add the NOT NULL constraint.
ALTER TABLE businesses ALTER COLUMN property_id SET NOT NULL;
