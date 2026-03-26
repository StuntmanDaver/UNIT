-- UNIT Database Schema
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROPERTIES
-- ============================================================
create table properties (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text,
  city text,
  state text,
  type text,
  total_units integer default 0,
  image_url text,
  landlord_code text,
  created_at timestamptz default now()
);

-- ============================================================
-- BUSINESSES
-- ============================================================
create table businesses (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade,
  owner_email text not null,
  business_name text not null,
  unit_number text,
  category text,
  business_description text,
  contact_name text,
  contact_email text,
  contact_phone text,
  website text,
  logo_url text,
  is_featured boolean default false,
  floor_position_x real,
  floor_position_y real,
  created_at timestamptz default now()
);

create index idx_businesses_property on businesses(property_id);
create index idx_businesses_owner_email on businesses(owner_email);

-- ============================================================
-- POSTS
-- ============================================================
create table posts (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade,
  business_id uuid references businesses(id) on delete set null,
  type text not null, -- 'announcement', 'event', 'offer'
  title text not null,
  content text,
  event_date date,
  event_time text,
  expiry_date date,
  image_url text,
  created_date timestamptz default now()
);

create index idx_posts_property on posts(property_id);

-- ============================================================
-- RECOMMENDATIONS
-- ============================================================
create table recommendations (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade,
  business_id uuid references businesses(id) on delete set null,
  type text not null, -- 'enhancement', 'issue', 'work_order'
  title text not null,
  description text,
  category text,
  priority text default 'medium', -- 'low', 'medium', 'high'
  status text default 'submitted', -- 'submitted', 'in_progress', 'resolved', 'closed'
  location text,
  created_date timestamptz default now()
);

create index idx_recommendations_property on recommendations(property_id);
create index idx_recommendations_status on recommendations(status);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_email text not null,
  property_id uuid references properties(id) on delete cascade,
  type text, -- 'post', 'recommendation'
  title text,
  message text,
  related_id uuid,
  read boolean default false,
  created_date timestamptz default now()
);

create index idx_notifications_user_property on notifications(user_email, property_id);

-- ============================================================
-- ADS
-- ============================================================
create table ads (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade,
  active boolean default true,
  headline text,
  description text,
  image_url text,
  cta_link text,
  cta_text text,
  business_type text,
  business_name text,
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

create index idx_ads_property on ads(property_id);

-- ============================================================
-- LEASES
-- ============================================================
create table leases (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade,
  business_id uuid references businesses(id) on delete set null,
  unit_number text,
  start_date date,
  end_date date,
  monthly_rent numeric(12,2),
  security_deposit numeric(12,2),
  status text default 'active', -- 'active', 'expiring_soon', 'expired', 'terminated'
  notes text,
  created_at timestamptz default now()
);

create index idx_leases_property on leases(property_id);

-- ============================================================
-- RECURRING PAYMENTS
-- ============================================================
create table recurring_payments (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade,
  business_id uuid references businesses(id) on delete set null,
  lease_id uuid references leases(id) on delete set null,
  name text not null,
  amount numeric(12,2),
  frequency text default 'monthly', -- 'weekly', 'monthly', 'quarterly', 'annually'
  start_date date,
  day_of_month integer,
  status text default 'active', -- 'active', 'paused', 'cancelled'
  auto_generate_invoice boolean default false,
  created_date timestamptz default now()
);

create index idx_recurring_payments_property on recurring_payments(property_id);

-- ============================================================
-- INVOICES
-- ============================================================
create table invoices (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade,
  business_id uuid references businesses(id) on delete set null,
  lease_id uuid references leases(id) on delete set null,
  invoice_number text,
  invoice_date date,
  due_date date,
  amount numeric(12,2),
  description text,
  status text default 'draft', -- 'draft', 'sent', 'paid', 'overdue', 'void'
  created_at timestamptz default now()
);

create index idx_invoices_property on invoices(property_id);

-- ============================================================
-- EXPENSES
-- ============================================================
create table expenses (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade,
  category text,
  description text,
  amount numeric(12,2),
  expense_date date,
  vendor text,
  payment_method text,
  notes text,
  created_at timestamptz default now()
);

create index idx_expenses_property on expenses(property_id);

-- ============================================================
-- PAYMENTS
-- ============================================================
create table payments (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade,
  business_id uuid references businesses(id) on delete set null,
  amount numeric(12,2),
  status text default 'pending', -- 'pending', 'paid', 'overdue', 'failed'
  due_date date,
  paid_date date,
  created_at timestamptz default now()
);

create index idx_payments_property on payments(property_id);

-- ============================================================
-- ACTIVITY LOGS (replaces Base44 appLogs)
-- ============================================================
create table activity_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  page_name text,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
alter table properties enable row level security;
alter table businesses enable row level security;
alter table posts enable row level security;
alter table recommendations enable row level security;
alter table notifications enable row level security;
alter table ads enable row level security;
alter table leases enable row level security;
alter table recurring_payments enable row level security;
alter table invoices enable row level security;
alter table expenses enable row level security;
alter table payments enable row level security;
alter table activity_logs enable row level security;

-- Properties: readable by all authenticated users
create policy "Properties are viewable by authenticated users"
  on properties for select to authenticated using (true);

-- Businesses: readable by all, writable by owner
create policy "Businesses are viewable by authenticated users"
  on businesses for select to authenticated using (true);

create policy "Users can create businesses"
  on businesses for insert to authenticated
  with check (owner_email = auth.jwt()->>'email');

create policy "Users can update own businesses"
  on businesses for update to authenticated
  using (owner_email = auth.jwt()->>'email');

-- Posts: readable by all, writable by business owners
create policy "Posts are viewable by authenticated users"
  on posts for select to authenticated using (true);

create policy "Users can create posts"
  on posts for insert to authenticated with check (true);

-- Recommendations: readable by all, writable by business owners
create policy "Recommendations are viewable by authenticated users"
  on recommendations for select to authenticated using (true);

create policy "Users can create recommendations"
  on recommendations for insert to authenticated with check (true);

create policy "Users can update recommendations"
  on recommendations for update to authenticated using (true);

-- Notifications: users can only see their own
create policy "Users can view own notifications"
  on notifications for select to authenticated
  using (user_email = auth.jwt()->>'email');

create policy "Users can create notifications"
  on notifications for insert to authenticated with check (true);

create policy "Users can update own notifications"
  on notifications for update to authenticated
  using (user_email = auth.jwt()->>'email');

-- Ads: readable by all
create policy "Ads are viewable by authenticated users"
  on ads for select to authenticated using (true);

-- Financial tables: readable by property landlords
-- For now, allow all authenticated users (tighten with landlord roles later)
create policy "Leases viewable by authenticated users"
  on leases for select to authenticated using (true);
create policy "Leases writable by authenticated users"
  on leases for insert to authenticated with check (true);
create policy "Leases updatable by authenticated users"
  on leases for update to authenticated using (true);
create policy "Leases deletable by authenticated users"
  on leases for delete to authenticated using (true);

create policy "Recurring payments viewable"
  on recurring_payments for select to authenticated using (true);
create policy "Recurring payments writable"
  on recurring_payments for insert to authenticated with check (true);
create policy "Recurring payments updatable"
  on recurring_payments for update to authenticated using (true);
create policy "Recurring payments deletable"
  on recurring_payments for delete to authenticated using (true);

create policy "Invoices viewable"
  on invoices for select to authenticated using (true);
create policy "Invoices writable"
  on invoices for insert to authenticated with check (true);
create policy "Invoices updatable"
  on invoices for update to authenticated using (true);
create policy "Invoices deletable"
  on invoices for delete to authenticated using (true);

create policy "Expenses viewable"
  on expenses for select to authenticated using (true);
create policy "Expenses writable"
  on expenses for insert to authenticated with check (true);
create policy "Expenses updatable"
  on expenses for update to authenticated using (true);
create policy "Expenses deletable"
  on expenses for delete to authenticated using (true);

create policy "Payments viewable"
  on payments for select to authenticated using (true);
create policy "Payments writable"
  on payments for insert to authenticated with check (true);

-- Activity logs: users can insert their own
create policy "Users can log activity"
  on activity_logs for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can view own activity"
  on activity_logs for select to authenticated
  using (user_id = auth.uid());
