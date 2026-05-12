-- Remote history placeholder.
--
-- The production Supabase migration table contains this version, but the
-- corresponding local migration file was not present in the repository. Keep
-- this no-op file so `supabase migration list` and `supabase db push --dry-run`
-- can reconcile local and remote migration histories without mutating schema.

SELECT 1;
