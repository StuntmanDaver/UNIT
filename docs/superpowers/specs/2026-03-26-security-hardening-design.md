# Security Hardening — C1, C2, C3, C5

> Date: 2026-03-26
> Status: Approved
> Scope: Critical security fixes only. Deferred: Zod validation (C4), warnings, info items.

## Problem

Five critical security vulnerabilities exist in the UNIT application after the Base44-to-Supabase migration:

1. **C1 — Landlord codes exposed client-side**: `propertiesService.list()` returns `landlord_code` to every authenticated user via `select('*')`. Any tenant can extract landlord codes from network responses and gain full landlord dashboard access.
2. **C2 — Financial tables wide open**: All 5 financial tables (`leases`, `recurring_payments`, `invoices`, `expenses`, `payments`) have RLS policies using `using (true)` / `with check (true)`, granting full CRUD to any authenticated user.
3. **C3 — Cross-property post/recommendation spoofing**: INSERT policies on `posts` and `recommendations` use `with check (true)`, allowing any user to create content impersonating businesses they don't own.
4. **C5 — Supabase client silently broken on missing env vars**: `supabaseClient.js` logs a warning but still calls `createClient(undefined, undefined)`, producing a broken client with cryptic downstream errors.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Landlord auth model | Hybrid: code-based onboarding + persistent `property_managers` record | Preserves existing UX, eliminates security hole |
| Code verification mechanism | Supabase Edge Function | Flexibility for rate limiting, logging, email notifications |
| Multiple managers per property | Yes, with `role` column (`owner`, `manager`) | Trivial schema cost, avoids painful migration later |
| Input validation (C4) | Deferred | RLS fixes are the urgent security layer; Supabase column types prevent worst mismatches |

## Architecture

### New Table: `property_managers`

```sql
create table property_managers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  role text not null default 'manager',  -- 'owner', 'manager'
  created_at timestamptz default now(),
  unique (user_id, property_id)
);

alter table property_managers enable row level security;

-- Managers can only read their own rows
create policy "Users can view own manager records"
  on property_managers for select to authenticated
  using (user_id = auth.uid());

-- No public INSERT/UPDATE/DELETE — only Edge Function (service role) writes
```

### Edge Function: `verify-landlord-code`

**Location:** `supabase/functions/verify-landlord-code/index.ts`

**Flow:**
1. Extract JWT from `Authorization` header, verify authenticated user
2. Parse `{ code }` from request body
3. Query `properties` table for matching `landlord_code` (using service role key — bypasses RLS)
4. If no match: return `{ error: "Invalid code" }` with 401 status
5. If match: upsert into `property_managers` (`user_id`, `property_id`, `role: 'manager'`)
6. Return `{ property_id, property_name }` with 200 status

**Security:**
- Uses `SUPABASE_SERVICE_ROLE_KEY` (server-only, never exposed to client)
- `landlord_code` column value never appears in the response
- Authenticated requests only (rejects anonymous)

### Hide `landlord_code` from Client

**Approach:** Revoke SELECT on `landlord_code` column from `authenticated` role at the database level.

```sql
revoke select (landlord_code) on properties from authenticated;
```

This is the simplest approach — no view needed, no service layer changes needed. The column simply won't appear in any client query result.

**Service layer update:** Change `propertiesService.list()` and `propertiesService.getById()` from `select('*')` to explicitly named columns. This prevents future columns from leaking and makes the query self-documenting:

```js
.select('id, name, address, city, state, type, total_units, image_url, created_at')
```

### Rewrite `LandlordLogin.jsx`

**Before:** Fetches all properties client-side, compares `landlord_code` in browser, stores `property_id` in `sessionStorage`.

**After:**
1. Remove the `useQuery` that fetches all properties
2. On form submit: call `supabase.functions.invoke('verify-landlord-code', { body: { code } })`
3. On success: navigate to `LandlordDashboard?propertyId={property_id}`
4. On error: show "Invalid access code" message
5. No `sessionStorage` write — the `property_managers` row IS the persistent auth

### Rewrite Landlord Session Checks

**Affected files:** `LandlordDashboard.jsx`, `LandlordRequests.jsx`, `Accounting.jsx`, any file reading `sessionStorage.getItem('landlord_property_id')`

**New pattern:**
```js
// Query managed properties for current user
const { data: managedProperties } = useQuery({
  queryKey: ['managedProperties', user?.id],
  queryFn: () => supabase
    .from('property_managers')
    .select('property_id, role, properties(name)')
    .eq('user_id', user.id),
  enabled: !!user?.id
});
```

- If `propertyId` URL param exists: verify user manages that property
- If user manages multiple properties: show property selector
- If user manages zero properties: redirect to `LandlordLogin`
- Remove all `sessionStorage` reads/writes for landlord auth

### Lock Down Financial Table RLS (C2)

**Migration:** Drop all existing permissive policies on financial tables, replace with property-manager-scoped policies.

```sql
-- Pattern applied to: leases, recurring_payments, invoices, expenses, payments

-- SELECT: only property managers can view
create policy "{table} viewable by property managers"
  on {table} for select to authenticated
  using (property_id in (
    select property_id from property_managers where user_id = auth.uid()
  ));

-- INSERT: only property managers can create
create policy "{table} insertable by property managers"
  on {table} for insert to authenticated
  with check (property_id in (
    select property_id from property_managers where user_id = auth.uid()
  ));

-- UPDATE: only property managers can modify
create policy "{table} updatable by property managers"
  on {table} for update to authenticated
  using (property_id in (
    select property_id from property_managers where user_id = auth.uid()
  ));

-- DELETE: only property managers can delete
create policy "{table} deletable by property managers"
  on {table} for delete to authenticated
  using (property_id in (
    select property_id from property_managers where user_id = auth.uid()
  ));
```

### Tighten Posts & Recommendations INSERT (C3)

```sql
-- Drop existing permissive INSERT policies
drop policy "Users can create posts" on posts;
drop policy "Users can create recommendations" on recommendations;

-- Posts: user can only create posts for businesses they own
create policy "Users can create posts for own businesses"
  on posts for insert to authenticated
  with check (
    business_id in (
      select id from businesses where owner_email = auth.jwt()->>'email'
    )
  );

-- Recommendations: user can only submit for own businesses
create policy "Users can create recommendations for own businesses"
  on recommendations for insert to authenticated
  with check (
    business_id in (
      select id from businesses where owner_email = auth.jwt()->>'email'
    )
  );
```

**Note:** The UPDATE policy on `recommendations` (`using (true)`) should also be tightened. Landlords need to update status on recommendations (e.g., mark as "resolved"), so the update policy becomes:

```sql
drop policy "Users can update recommendations" on recommendations;

-- Business owners can update their own recommendations
create policy "Business owners can update own recommendations"
  on recommendations for update to authenticated
  using (
    business_id in (
      select id from businesses where owner_email = auth.jwt()->>'email'
    )
  );

-- Property managers can update recommendations for their properties
create policy "Property managers can update recommendations"
  on recommendations for update to authenticated
  using (
    property_id in (
      select property_id from property_managers where user_id = auth.uid()
    )
  );
```

### Fix Supabase Client Crash (C5)

```js
// src/services/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing required Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## File Inventory

### New files
| File | Purpose |
|------|---------|
| `supabase/functions/verify-landlord-code/index.ts` | Edge Function for server-side code verification |
| `supabase/migrations/004_security_hardening.sql` | New table + RLS policy overhaul |

### Modified files
| File | Changes |
|------|---------|
| `src/services/supabaseClient.js` | Throw on missing env vars (C5) |
| `src/services/properties.js` | Explicit column select (no `select('*')`) |
| `src/pages/LandlordLogin.jsx` | Remove client-side code comparison, call Edge Function |
| `src/pages/LandlordDashboard.jsx` | Replace sessionStorage with `property_managers` query |
| `src/pages/LandlordRequests.jsx` | Replace sessionStorage with `property_managers` query |
| `src/pages/Accounting.jsx` | Replace sessionStorage with `property_managers` query |
| `src/components/LandlordNotificationBell.jsx` | Update to use `property_managers` context if needed |

## Migration Strategy

Single migration file `004_security_hardening.sql` that:
1. Creates `property_managers` table with RLS
2. Revokes SELECT on `properties.landlord_code` from `authenticated`
3. Drops all permissive financial table policies (C2)
4. Creates property-manager-scoped financial table policies
5. Drops permissive INSERT policies on `posts` and `recommendations` (C3)
6. Creates business-ownership-checked INSERT policies
7. Creates split UPDATE policies on `recommendations` (owner + manager)

**Edge Function** deployed separately via `supabase functions deploy verify-landlord-code`.

## Testing Checklist

- [ ] Tenant cannot see `landlord_code` in any API response
- [ ] Tenant cannot access financial tables (SELECT/INSERT/UPDATE/DELETE all return empty/denied)
- [ ] Tenant cannot create posts for businesses they don't own
- [ ] Tenant cannot create recommendations for businesses they don't own
- [ ] Valid landlord code creates `property_managers` record and redirects to dashboard
- [ ] Invalid landlord code shows error, no record created
- [ ] Repeat code entry for same user+property is idempotent (upsert)
- [ ] Landlord can access financial data for their managed properties only
- [ ] Landlord can update recommendation status for their properties
- [ ] App crashes with clear error message when env vars are missing
- [ ] Existing landlord workflows (dashboard, requests, accounting) work end-to-end after migration
- [ ] Multi-property manager can switch between properties

## Out of Scope

- C4: Zod input validation in service layer (follow-up)
- W1-W12: Code quality warnings (follow-up)
- I1-I11: Info items (follow-up)
- Admin interface for managing `property_managers` records
- Rate limiting on Edge Function (future enhancement)
