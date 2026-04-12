-- Reconcile legacy short-name property seeds with the canonical LLC-backed property records.
-- This keeps fresh environments clean and repairs older deployments that already applied
-- the deprecated short-name seed.

do $$
declare
  property_pair record;
begin
  for property_pair in
    with mappings(short_name, canonical_name) as (
      values
        ('Vero', 'VD Vero, LLC'),
        ('Daytona 1', 'VD Daytona 1 , LLC'),
        ('Daytona 2', 'VD Daytona 2, LLC'),
        ('Daytona 3', 'VD Daytona 3, LLC'),
        ('East Park', 'VP DC East Park LLC'),
        ('South Jax', 'Decker Center South Jax, LLC'),
        ('Riverdale', 'DC Riverdale, LLC')
    )
    select
      short_property.id as short_id,
      canonical_property.id as canonical_id
    from mappings
    join properties as short_property
      on short_property.name = mappings.short_name
    join properties as canonical_property
      on canonical_property.name = mappings.canonical_name
    where short_property.id <> canonical_property.id
  loop
    update units set property_id = property_pair.canonical_id where property_id = property_pair.short_id;
    update businesses set property_id = property_pair.canonical_id where property_id = property_pair.short_id;
    update posts set property_id = property_pair.canonical_id where property_id = property_pair.short_id;
    update recommendations set property_id = property_pair.canonical_id where property_id = property_pair.short_id;
    update notifications set property_id = property_pair.canonical_id where property_id = property_pair.short_id;
    update ads set property_id = property_pair.canonical_id where property_id = property_pair.short_id;
    update leases set property_id = property_pair.canonical_id where property_id = property_pair.short_id;
    update recurring_payments set property_id = property_pair.canonical_id where property_id = property_pair.short_id;
    update invoices set property_id = property_pair.canonical_id where property_id = property_pair.short_id;
    update expenses set property_id = property_pair.canonical_id where property_id = property_pair.short_id;
    update payments set property_id = property_pair.canonical_id where property_id = property_pair.short_id;
    update advertiser_promotions set property_id = property_pair.canonical_id where property_id = property_pair.short_id;

    update profiles
    set property_ids = (
      select coalesce(array_agg(distinct property_id_value), '{}'::uuid[])
      from unnest(array_replace(property_ids, property_pair.short_id, property_pair.canonical_id)) as property_id_value
    )
    where property_pair.short_id = any(property_ids);

    delete from properties where id = property_pair.short_id;
  end loop;
end;
$$;
