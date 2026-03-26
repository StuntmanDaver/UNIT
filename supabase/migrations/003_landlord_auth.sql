-- Migration 003: Landlord Auth Foundation
-- Creates profiles table, is_landlord() + landlord_property_ids() helpers,
-- property-scoped financial RLS, landlord_code neutralization, and append-only audit_log table.
-- Phase 1: Security & Access Control

-- ============================================================
-- SECTION 1: profiles table
-- ============================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'tenant' check (role in ('tenant', 'landlord')),
  property_ids uuid[] default '{}',
  email text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select to authenticated
  using (id = auth.uid());

create policy "Service role can manage profiles"
  on profiles for all to service_role
  using (true) with check (true);

-- ============================================================
-- SECTION 2: is_landlord() helper function
-- ============================================================

create or replace function is_landlord()
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
    and role = 'landlord'
  );
$$;

-- ============================================================
-- SECTION 3: landlord_property_ids() helper function (AUTH-03 property isolation)
-- ============================================================

create or replace function landlord_property_ids()
returns uuid[]
language sql security definer stable
as $$
  select coalesce(
    (select property_ids from profiles where id = auth.uid() and role = 'landlord'),
    '{}'::uuid[]
  );
$$;

-- ============================================================
-- SECTION 4: Drop placeholder financial policies and replace with property-scoped policies
-- ============================================================

-- Drop existing placeholder leases policies
drop policy "Leases viewable by authenticated users" on leases;
drop policy "Leases writable by authenticated users" on leases;
drop policy "Leases updatable by authenticated users" on leases;
drop policy "Leases deletable by authenticated users" on leases;

-- Drop existing placeholder recurring_payments policies
drop policy "Recurring payments viewable" on recurring_payments;
drop policy "Recurring payments writable" on recurring_payments;
drop policy "Recurring payments updatable" on recurring_payments;
drop policy "Recurring payments deletable" on recurring_payments;

-- Drop existing placeholder invoices policies
drop policy "Invoices viewable" on invoices;
drop policy "Invoices writable" on invoices;
drop policy "Invoices updatable" on invoices;
drop policy "Invoices deletable" on invoices;

-- Drop existing placeholder expenses policies
drop policy "Expenses viewable" on expenses;
drop policy "Expenses writable" on expenses;
drop policy "Expenses updatable" on expenses;
drop policy "Expenses deletable" on expenses;

-- Drop existing placeholder payments policies
drop policy "Payments viewable" on payments;
drop policy "Payments writable" on payments;

-- Replace with property-scoped landlord policies: leases
create policy "Leases viewable by landlords"
  on leases for select to authenticated
  using (is_landlord() and property_id = any(landlord_property_ids()));

create policy "Leases writable by landlords"
  on leases for insert to authenticated
  with check (is_landlord() and property_id = any(landlord_property_ids()));

create policy "Leases updatable by landlords"
  on leases for update to authenticated
  using (is_landlord() and property_id = any(landlord_property_ids()));

create policy "Leases deletable by landlords"
  on leases for delete to authenticated
  using (is_landlord() and property_id = any(landlord_property_ids()));

-- Replace with property-scoped landlord policies: recurring_payments
create policy "Recurring payments viewable by landlords"
  on recurring_payments for select to authenticated
  using (is_landlord() and property_id = any(landlord_property_ids()));

create policy "Recurring payments writable by landlords"
  on recurring_payments for insert to authenticated
  with check (is_landlord() and property_id = any(landlord_property_ids()));

create policy "Recurring payments updatable by landlords"
  on recurring_payments for update to authenticated
  using (is_landlord() and property_id = any(landlord_property_ids()));

create policy "Recurring payments deletable by landlords"
  on recurring_payments for delete to authenticated
  using (is_landlord() and property_id = any(landlord_property_ids()));

-- Replace with property-scoped landlord policies: invoices
create policy "Invoices viewable by landlords"
  on invoices for select to authenticated
  using (is_landlord() and property_id = any(landlord_property_ids()));

create policy "Invoices writable by landlords"
  on invoices for insert to authenticated
  with check (is_landlord() and property_id = any(landlord_property_ids()));

create policy "Invoices updatable by landlords"
  on invoices for update to authenticated
  using (is_landlord() and property_id = any(landlord_property_ids()));

create policy "Invoices deletable by landlords"
  on invoices for delete to authenticated
  using (is_landlord() and property_id = any(landlord_property_ids()));

-- Replace with property-scoped landlord policies: expenses
create policy "Expenses viewable by landlords"
  on expenses for select to authenticated
  using (is_landlord() and property_id = any(landlord_property_ids()));

create policy "Expenses writable by landlords"
  on expenses for insert to authenticated
  with check (is_landlord() and property_id = any(landlord_property_ids()));

create policy "Expenses updatable by landlords"
  on expenses for update to authenticated
  using (is_landlord() and property_id = any(landlord_property_ids()));

create policy "Expenses deletable by landlords"
  on expenses for delete to authenticated
  using (is_landlord() and property_id = any(landlord_property_ids()));

-- Replace with property-scoped landlord policies: payments
create policy "Payments viewable by landlords"
  on payments for select to authenticated
  using (is_landlord() and property_id = any(landlord_property_ids()));

create policy "Payments writable by landlords"
  on payments for insert to authenticated
  with check (is_landlord() and property_id = any(landlord_property_ids()));

create policy "Payments updatable by landlords"
  on payments for update to authenticated
  using (is_landlord() and property_id = any(landlord_property_ids()));

create policy "Payments deletable by landlords"
  on payments for delete to authenticated
  using (is_landlord() and property_id = any(landlord_property_ids()));

-- ============================================================
-- SECTION 5: landlord_code field neutralization (D-06, AUTH-06)
-- ============================================================

update properties set landlord_code = null;

create or replace function prevent_landlord_code_write()
returns trigger language plpgsql as $$
begin
  new.landlord_code = null;
  return new;
end;
$$;

create trigger no_landlord_code
  before insert or update on properties
  for each row execute function prevent_landlord_code_write();

-- ============================================================
-- SECTION 6: audit_log table (D-15, append-only)
-- ============================================================

create table audit_log (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  performed_by_user_id uuid references auth.users(id) on delete set null,
  performed_by_email text,
  performed_at timestamptz default now()
);

alter table audit_log enable row level security;

create policy "Landlords can insert audit entries"
  on audit_log for insert to authenticated
  with check (is_landlord());

create policy "Landlords can read audit entries"
  on audit_log for select to authenticated
  using (is_landlord());
-- Intentionally NO update or delete policies (append-only per D-15)
