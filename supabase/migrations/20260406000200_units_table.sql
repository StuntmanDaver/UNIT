-- UNIT Database Schema - Migration 002
-- Adds units table and wires it into businesses and leases

-- ============================================================
-- UNITS
-- ============================================================
create table units (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  unit_number text not null,
  street_address text not null,
  city text not null,
  state text not null,
  zip text not null,
  building text, -- sub-building / block code within a multi-building property (e.g. 'A', 'B', 'North Wing')
  status text default 'vacant' check (status in ('vacant', 'occupied', 'maintenance')),
  created_at timestamptz default now(),
  constraint uq_units_property_unit unique (property_id, unit_number)
);

-- idx_units_property is omitted: the unique constraint on (property_id, unit_number)
-- already provides an index that covers property_id lookups.
create index idx_units_status on units(status);

-- ============================================================
-- ADD unit_id FK TO BUSINESSES
-- ============================================================
alter table businesses
  add column unit_id uuid references units(id) on delete set null;

create index idx_businesses_unit on businesses(unit_id);

-- ============================================================
-- ADD unit_id FK TO LEASES
-- ============================================================
alter table leases
  add column unit_id uuid references units(id) on delete set null;

create index idx_leases_unit on leases(unit_id);

-- ============================================================
-- TRIGGER: auto-update unit status on business insert/update/delete
-- ============================================================
create or replace function update_unit_status()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    if new.unit_id is not null then
      update units set status = 'occupied' where id = new.unit_id;
    end if;
    return new;
  end if;

  if (tg_op = 'UPDATE') then
    -- Only act when the unit assignment actually changed
    if old.unit_id is distinct from new.unit_id then
      -- Release the old unit if no other business still occupies it
      if old.unit_id is not null then
        if not exists (
          select 1 from businesses
          where unit_id = old.unit_id
            and id <> old.id
        ) then
          update units set status = 'vacant' where id = old.unit_id;
        end if;
      end if;

      -- Mark the new unit occupied
      if new.unit_id is not null then
        update units set status = 'occupied' where id = new.unit_id;
      end if;
    end if;
    return new;
  end if;

  if (tg_op = 'DELETE') then
    if old.unit_id is not null then
      -- Only mark vacant when no other business still occupies this unit
      if not exists (
        select 1 from businesses
        where unit_id = old.unit_id
          and id <> old.id
      ) then
        update units set status = 'vacant' where id = old.unit_id;
      end if;
    end if;
    return old;
  end if;

  return null;
end;
$$;

create trigger trg_business_unit_status
  after insert or update of unit_id or delete
  on businesses
  for each row
  execute function update_unit_status();

-- ============================================================
-- ROW-LEVEL SECURITY
-- Policies currently allow any authenticated user full access.
-- Tighten these with role-based checks (e.g. property manager,
-- owner) once the roles system is in place.
-- ============================================================

alter table units enable row level security;

create policy "Units are viewable by authenticated users"
  on units for select to authenticated using (true);

create policy "Units are writable by authenticated users"
  on units for insert to authenticated with check (true);

create policy "Units are updatable by authenticated users"
  on units for update to authenticated using (true);

create policy "Units are deletable by authenticated users"
  on units for delete to authenticated using (true);
