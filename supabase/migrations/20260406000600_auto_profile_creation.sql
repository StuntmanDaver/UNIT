-- Migration 004: Auto-create profile on user signup
-- Ensures every authenticated user gets a profile row so RLS policies work

-- Trigger function: creates a tenant profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, property_ids, email)
  values (new.id, 'tenant', '{}', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Wire the trigger to auth.users inserts (idempotent)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: create profiles for any existing auth users who don't have one
insert into public.profiles (id, role, property_ids, email)
select id, 'tenant', '{}', email
from auth.users
where id not in (select id from public.profiles)
on conflict (id) do nothing;
