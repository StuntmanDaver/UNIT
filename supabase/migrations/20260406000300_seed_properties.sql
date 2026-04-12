-- Legacy seed placeholder kept only to preserve migration ordering.
-- Canonical property creation now lives in `20260406000500_seed_decker_properties.sql`.
-- Existing deployments that still contain the short-name properties are reconciled by
-- `20260407193000_reconcile_property_seeds.sql`.
do $$
begin
  null;
end;
$$;
