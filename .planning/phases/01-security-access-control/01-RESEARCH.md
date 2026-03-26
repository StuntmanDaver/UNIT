# Phase 1: Security & Access Control - Research

**Researched:** 2026-03-26
**Domain:** Supabase RLS, React Router v6 route guards, multi-property context, magic link auth, append-only audit log
**Confidence:** HIGH (all core patterns verified against existing codebase code, Supabase official docs, and prior ARCHITECTURE/STACK research)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Landlord Login Flow**
- D-01: Landlords authenticate via Supabase magic link (passwordless email). No password management needed.
- D-02: Keep a separate /LandlordLogin page with landlord-specific branding — do not merge with tenant login flow.
- D-03: Landlord role and property associations stored in a `profiles` table (user_id, role, property_ids). Not in user_metadata — the profiles table supports multi-property associations and is queryable via RLS.

**Auth Migration Path**
- D-04: Existing landlords are onboarded via invitation emails. Admin sends invite, landlord clicks link and creates Supabase account.
- D-05: Code-based login is disabled immediately once invitations are sent — no parallel-run window. Clean cutover.
- D-06: The `landlord_code` field on the properties table should be removed or access-restricted after migration.

**Multi-Property Switcher**
- D-07: Property switcher lives in the header navbar as a dropdown — always visible on landlord pages. Similar to Slack/Notion workspace switchers.
- D-08: Switching properties stays on the same page — data reloads in place. If on Dashboard, stay on Dashboard with new property data.
- D-09: Switcher is hidden if landlord has only one property. Only shown for landlords with 2+ properties.
- D-10: Active property is persisted to localStorage. On login, auto-selects last active property.
- D-11: Property switch must invalidate TanStack Query cache atomically to prevent stale cross-property data rendering.

**Audit Trail**
- D-12: Audit trail is landlord-only. Tenants do not see audit entries.
- D-13: Audit appears both inline (timeline on individual records) and as a dedicated filterable /audit page.
- D-14: Full actor tracking — log user ID, email, and role for every mutation. Not just "a change happened."
- D-15: AuditLog is an append-only Supabase table. Entries are never updated or deleted.

### Claude's Discretion
- RLS policy structure and exact SQL for the policies
- PropertyContext React implementation details
- LandlordGuard component internals
- AuditLogger utility module design
- Header dropdown component styling (within existing brand identity)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Landlord users have server-validated role accounts (Supabase RLS) replacing code-based sessionStorage auth | profiles table + Supabase magic link; existing `sessionStorage` pattern identified in `LandlordDashboard.jsx` line 38-41 |
| AUTH-02 | All landlord routes (Dashboard, Requests, Accounting) are protected by a centralized LandlordGuard component in React Router | React Router v6 Outlet-based guard pattern; App.jsx flat route structure identified — requires guard wrapper approach |
| AUTH-03 | Supabase RLS rules enforce entity-level access control so landlord data cannot be accessed via direct API calls | Supabase RLS migration SQL already written but uses placeholder "allow all" policies; must be replaced with landlord-role-gated policies |
| AUTH-04 | Landlord can switch between multiple properties within one session without logout/login | PropertyContext + localStorage persistence; TanStack Query cache invalidation via `queryClient.invalidateQueries()` |
| AUTH-05 | Auth migration includes a transition window so active landlord sessions are not disrupted | Clean cutover decided (D-05); transition is landlord communication + invitation flow, not a parallel-run code window |
| AUTH-06 | Landlord codes are no longer exposed in client-side API responses (field-level security or removal) | Supabase does not have native column-level security — must use RLS policy with column exclusion or a dedicated migration to NULL/remove the field |
</phase_requirements>

---

## Summary

Phase 1 replaces an entirely client-side landlord authentication system (sessionStorage + landlord_code matching) with Supabase-backed server-validated role authentication. The project has already migrated from Base44 to Supabase — the Supabase client is live at `src/services/supabaseClient.js`, the auth session management is functional in `AuthContext.jsx`, and the database schema exists at `supabase/migrations/001_initial_schema.sql`. What is missing: (1) a `profiles` table linking Supabase auth users to their landlord role and permitted properties, (2) Supabase RLS policies that actually enforce landlord-only access on financial tables (the current migration uses `using (true)` placeholders), (3) a React Router guard component that checks role before rendering landlord pages, and (4) a PropertyContext for multi-property switching with cache invalidation.

The CONTEXT.md research has shifted this phase from the Base44 patterns documented in `.planning/research/ARCHITECTURE.md` to Supabase-native patterns. The planner should treat any Base44-specific references in ARCHITECTURE.md as superseded by this document for Phase 1 scope. The core patterns — route guard via Outlet, PropertyContext via React Context + localStorage, AuditLogger as a fire-and-forget module — remain the same; only the backend enforcement layer changes from Base44 RLS DSL to standard PostgreSQL RLS SQL.

The existing `001_initial_schema.sql` migration already enables RLS on all tables. The Phase 1 work is additive: a new migration file creates the `profiles` table, replaces the placeholder financial table policies, and adds a restricted view (or policy) for `landlord_code`. No existing tenant-facing RLS policies need to be removed.

**Primary recommendation:** Build the Supabase `profiles` table and role-checking RLS policies first (database wave), then extend AuthContext to fetch from profiles (auth wave), then build LandlordGuard and PropertyContext (frontend wave), then replace LandlordLogin with magic link flow and add AuditLog table + AuditLogger module (final wave).

---

## Standard Stack

### Core (no new packages needed for auth hardening or route guard)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.100.0 (installed) | Supabase client — auth, magic link, RLS-protected queries | Already installed and wired in `supabaseClient.js`; all existing service files use it |
| `react-router-dom` | 6.26.0 (installed) | Client-side routing with `<Outlet>` for route guard wrapping | Already installed; v6 Outlet pattern is the standard approach for role-based route groups |
| `@tanstack/react-query` | 5.84.1 (installed) | Server state caching with `queryClient.invalidateQueries()` for property switching | Already installed; all existing data fetching uses it |

### Supporting (no new packages)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Framer Motion | 11.16.4 (installed) | Auth page transition animations | LandlordLogin card mount; form-to-confirmation fade |
| shadcn/ui (installed set) | varies | DropdownMenu for PropertySwitcher, Skeleton for audit loading states | All required components confirmed installed in `src/components/ui/` |
| Lucide React | 0.475.0 (installed) | Icons: Lock, Mail, ChevronDown, Loader2 | Icon library already used throughout |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase `profiles` table for role | `user_metadata` in Supabase auth | `user_metadata` can be set by the client — insecure for role storage. Profiles table is server-side and RLS-protectable. Use profiles table (D-03). |
| Magic link (passwordless) | Email + password | User decided D-01 — magic link only. No password management complexity, no password reset flow needed. |
| React Router `<Outlet>` guard | Per-page `useEffect` redirect | Per-page guards are the current broken pattern (missing from Accounting and LandlordRequests). Outlet guard is one implementation point. |
| `queryClient.invalidateQueries()` on property switch | `queryClient.clear()` | `clear()` also clears tenant data queries; `invalidateQueries({ queryKey: ['landlord'] })` is more surgical. Either is acceptable — see note in Pitfalls. |

**Installation:** No new packages required for this phase.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   └── guards/
│       └── LandlordGuard.jsx        # NEW — route guard requiring landlord role
├── lib/
│   ├── AuthContext.jsx              # MODIFY — fetch + expose role and property_ids from profiles
│   ├── PropertyContext.jsx          # NEW — active property state + localStorage persistence
│   └── AuditLogger.js              # NEW — fire-and-forget audit write module
├── pages/
│   ├── LandlordLogin.jsx            # REWRITE — replace code form with magic link form
│   ├── LandlordDashboard.jsx        # MODIFY — remove sessionStorage guard, consume PropertyContext
│   ├── Accounting.jsx               # MODIFY — remove any inline URL-only guard (none present, just add context)
│   ├── LandlordRequests.jsx         # MODIFY — remove any inline URL-only guard
│   └── Unauthorized.jsx             # NEW — 403 fallback page for non-landlord users
├── App.jsx                          # MODIFY — wrap landlord routes in LandlordGuard <Outlet>
supabase/
└── migrations/
    └── 003_landlord_auth.sql        # NEW — profiles table + tightened RLS policies + audit_log table
```

**Key constraint from App.jsx inspection:** The current routing uses `pages.config.js` auto-generation which produces flat `<Route>` elements inside a `.map()`. The LandlordGuard must be added as a wrapper in `App.jsx`'s `AuthenticatedApp` component, not inside `pages.config.js` (which is auto-generated and must not be manually edited per CLAUDE.md).

The approach: modify `AuthenticatedApp` in `App.jsx` to render landlord routes outside the `.map()` loop, wrapped in `<Route element={<LandlordGuard />}>`. This means LandlordDashboard, LandlordRequests, and Accounting routes must be explicitly listed in App.jsx as guarded routes. This is the correct pattern and does not conflict with pages.config.js continuing to export them.

---

### Pattern 1: Supabase Magic Link Auth Flow

**What:** `LandlordLogin.jsx` sends a magic link via `supabase.auth.signInWithOtp({ email })`. On email click, Supabase redirects back to the app with a session token. `AuthContext.jsx` already handles `onAuthStateChange` and will pick up the new session automatically.

**When to use:** Any new landlord session initiation.

**Configuration required:** In Supabase Dashboard → Authentication → URL Configuration, add the app's URL to "Redirect URLs". The redirect target after magic link click is the app root; the existing `onAuthStateChange` listener will detect the session and route the user.

**Example:**
```javascript
// src/pages/LandlordLogin.jsx — magic link send
const handleSendLink = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: window.location.origin + '/LandlordDashboard'
    }
  });
  if (error) {
    setError('Something went wrong sending your link. Check your email address and try again.');
  } else {
    setEmailSent(true); // triggers confirmation UI state
  }
  setIsSubmitting(false);
};
```

**After session established:** `AuthContext.onAuthStateChange` fires with the new session. `AuthContext` then fetches the user's profile from the `profiles` table to get their role and property_ids. If role is not `landlord`, the LandlordGuard redirects to `/Welcome`.

---

### Pattern 2: Profiles Table + Role-Gated RLS

**What:** A new `profiles` table joins Supabase `auth.users` to application-level role and property assignments. Supabase RLS policies on financial tables check `profiles.role = 'landlord'` using a helper function.

**Profiles table schema:**
```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'tenant' check (role in ('tenant', 'landlord')),
  property_ids uuid[] default '{}',
  email text,
  created_at timestamptz default now()
);

-- Profiles are only readable by the owner and service role
alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select to authenticated
  using (id = auth.uid());

-- Only service role (admin operations) can set role
create policy "Service role can manage profiles"
  on profiles for all to service_role
  using (true) with check (true);
```

**Helper function for RLS checks:**
```sql
-- Reusable function — avoids subquery in every policy
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
```

**Tightened financial table policies (replace existing `using (true)` placeholders):**
```sql
-- Drop existing placeholder policies first, then add role-gated ones
-- Example for leases (repeat pattern for invoices, expenses, payments, recurring_payments):

drop policy "Leases viewable by authenticated users" on leases;
drop policy "Leases writable by authenticated users" on leases;
drop policy "Leases updatable by authenticated users" on leases;
drop policy "Leases deletable by authenticated users" on leases;

create policy "Leases viewable by landlords"
  on leases for select to authenticated
  using (is_landlord());

create policy "Leases writable by landlords"
  on leases for insert to authenticated
  with check (is_landlord());

create policy "Leases updatable by landlords"
  on leases for update to authenticated
  using (is_landlord());

create policy "Leases deletable by landlords"
  on leases for delete to authenticated
  using (is_landlord());
```

**Confidence: HIGH** — PostgreSQL RLS with `security definer` helper function is the standard Supabase pattern for role checking. Verified via Supabase official docs. The `is_landlord()` helper avoids a correlated subquery in every policy, which is both cleaner and avoids the "infinite recursion" pitfall that occurs when a policy queries the same table it's protecting.

---

### Pattern 3: landlord_code Field Restriction (AUTH-06)

**What:** Supabase does not support column-level security (CLS) natively — RLS is row-level only. To hide `landlord_code` from tenant API responses there are two options:

**Option A — Null the column (recommended, D-06 says "remove or restrict"):**
```sql
-- In migration 003: set all landlord_code values to null
update properties set landlord_code = null;
-- Add a trigger to prevent future writes
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
```

**Option B — Dedicated landlord view:**
```sql
-- Create a view that includes landlord_code, accessible only to service role
-- Tenants query `properties` (no landlord_code); landlords query `properties_admin` view
-- More complex to wire into service layer
```

**Recommendation:** Option A (null + trigger) is simpler, requires no service layer changes, and satisfies D-06. Option B is only needed if landlords specifically need to see the landlord_code post-migration (they don't — the field is being deprecated). Use Option A.

**Confidence: MEDIUM** — RLS column exclusion limitation verified (Supabase does not support CLS). Trigger approach is standard PostgreSQL. The exact trigger syntax is standard and not Supabase-specific.

---

### Pattern 4: LandlordGuard via React Router v6 Outlet

**What:** A component that reads auth state and landlord role from `AuthContext`, renders a spinner during loading, and either renders `<Outlet />` (landlord routes proceed) or redirects.

**Example:**
```jsx
// src/components/guards/LandlordGuard.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Loader2 } from 'lucide-react';

export default function LandlordGuard() {
  const { user, isLoadingAuth, isLandlord } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-brand-navy">
        <Loader2 className="w-8 h-8 animate-spin text-brand-slate-light" />
      </div>
    );
  }

  if (!user) return <Navigate to="/LandlordLogin" replace />;
  if (!isLandlord) return <Navigate to="/Welcome" replace />;

  return <Outlet />;
}
```

**App.jsx integration:** The existing `AuthenticatedApp` function renders all routes via `pages.config.js` map. Landlord routes must be carved out from this map and wrapped explicitly:

```jsx
// src/App.jsx — AuthenticatedApp modification
// After the general routes map, add:
<Route element={<LandlordGuard />}>
  <Route path="/LandlordDashboard" element={
    <PropertyProvider>
      <LayoutWrapper currentPageName="LandlordDashboard">
        <LandlordDashboard />
      </LayoutWrapper>
    </PropertyProvider>
  } />
  <Route path="/LandlordRequests" element={
    <PropertyProvider>
      <LayoutWrapper currentPageName="LandlordRequests">
        <LandlordRequests />
      </LayoutWrapper>
    </PropertyProvider>
  } />
  <Route path="/Accounting" element={
    <PropertyProvider>
      <LayoutWrapper currentPageName="Accounting">
        <Accounting />
      </LayoutWrapper>
    </PropertyProvider>
  } />
</Route>
```

These routes must also remain in `pages.config.js` PAGES export (for the auto-import to work), but the route path resolution in App.jsx will be controlled by the guard wrapper. Since App.jsx processes the `pages.config.js` map first via `.map()`, the explicit guarded routes added after the map will take precedence due to React Router's first-match-wins behavior — or alternatively, exclude the landlord pages from the map loop using a filter. The safest approach: filter them out of the map and register them explicitly under the guard.

---

### Pattern 5: AuthContext Extension — Profile Fetch + isLandlord

**What:** Extend `AuthContext` to fetch from the `profiles` table after session is established and expose `isLandlord` boolean and `propertyIds` array.

```jsx
// Addition to AuthContext.jsx — profile fetch on session change
const fetchUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, property_ids, email')
    .eq('id', userId)
    .single();

  if (error || !data) {
    // User has no profile — treat as tenant (non-landlord)
    setUserRole('tenant');
    setPropertyIds([]);
    return;
  }

  setUserRole(data.role);
  setPropertyIds(data.property_ids ?? []);
};

// In onAuthStateChange callback:
if (session?.user) {
  setUser(session.user);
  setIsAuthenticated(true);
  await fetchUserProfile(session.user.id); // fetch role
}
```

**New values exposed via context:**
- `isLandlord` — boolean, derived from `userRole === 'landlord'`
- `propertyIds` — uuid[] of permitted properties for this landlord

---

### Pattern 6: PropertyContext — Multi-Property Switching

**What:** A React context that holds the active `propertyId`, persists to localStorage, and triggers TanStack Query invalidation on switch.

```jsx
// src/lib/PropertyContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const PropertyContext = createContext(null);

export function PropertyProvider({ children }) {
  const queryClient = useQueryClient();
  const [activePropertyId, setActivePropertyId] = useState(
    () => localStorage.getItem('active_property_id') ?? null
  );

  const switchProperty = useCallback((propertyId) => {
    localStorage.setItem('active_property_id', propertyId);
    setActivePropertyId(propertyId);
    // Invalidate all property-scoped queries atomically
    queryClient.invalidateQueries();
  }, [queryClient]);

  return (
    <PropertyContext.Provider value={{ activePropertyId, switchProperty }}>
      {children}
    </PropertyContext.Provider>
  );
}

export const useProperty = () => {
  const ctx = useContext(PropertyContext);
  if (!ctx) throw new Error('useProperty must be used within PropertyProvider');
  return ctx;
};
```

**D-11 implementation note:** `queryClient.invalidateQueries()` with no arguments invalidates all cached queries. This is intentionally broad — on property switch we want all data refreshed, not just some of it. The slight overhead (one extra round-trip for non-property queries) is acceptable for correctness.

---

### Pattern 7: AuditLogger Module

**What:** A thin wrapper that writes to the `audit_log` Supabase table. Called fire-and-forget inside `useMutation.onSuccess`. Audit write failure must never block the primary mutation.

**AuditLog table (in migration 003):**
```sql
create table audit_log (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null,       -- 'recommendation', 'invoice', 'lease', etc.
  entity_id uuid not null,
  action text not null,             -- 'status_changed', 'created', 'updated', 'deleted'
  old_value jsonb,
  new_value jsonb,
  performed_by_user_id uuid references auth.users(id) on delete set null,
  performed_by_email text,
  performed_at timestamptz default now()
);

-- Append-only: no update/delete policies
alter table audit_log enable row level security;

create policy "Landlords can insert audit entries"
  on audit_log for insert to authenticated
  with check (is_landlord());

create policy "Landlords can read audit entries"
  on audit_log for select to authenticated
  using (is_landlord());
-- Intentionally no UPDATE or DELETE policies
```

**AuditLogger module:**
```javascript
// src/lib/AuditLogger.js
import { supabase } from '@/services/supabaseClient';

export async function writeAudit({ entityType, entityId, action, oldValue, newValue, userId, userEmail }) {
  return supabase.from('audit_log').insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    old_value: oldValue ?? null,
    new_value: newValue ?? null,
    performed_by_user_id: userId,
    performed_by_email: userEmail,
    performed_at: new Date().toISOString()
  });
  // Note: caller should .catch(() => {}) — do not re-throw
}
```

**Usage:**
```javascript
// Inside useMutation onSuccess:
onSuccess: (data, variables) => {
  queryClient.invalidateQueries(['recommendations', propertyId]);
  writeAudit({
    entityType: 'recommendation',
    entityId: variables.id,
    action: 'status_changed',
    oldValue: { status: previousStatus },
    newValue: { status: variables.status },
    userId: user.id,
    userEmail: user.email
  }).catch(() => {}); // audit failure never blocks UI
}
```

---

### Pattern 8: PropertySwitcher Header Component

**What:** A `DropdownMenu` in the landlord header bar showing the active property name with a chevron, listing all permitted properties. Hidden when `propertyIds.length <= 1` (D-09).

```jsx
// src/components/PropertySwitcher.jsx
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check } from 'lucide-react';
import { useProperty } from '@/lib/PropertyContext';

export default function PropertySwitcher({ properties }) {
  const { activePropertyId, switchProperty } = useProperty();

  if (!properties || properties.length <= 1) return null; // D-09

  const activeProperty = properties.find(p => p.id === activePropertyId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="text-white gap-2">
          {activeProperty?.name ?? 'Select property'}
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px]">
        {properties.map(property => (
          <DropdownMenuItem
            key={property.id}
            onClick={() => switchProperty(property.id)}
            className="flex items-center justify-between"
          >
            {property.name}
            {property.id === activePropertyId && <Check className="w-4 h-4 text-brand-slate" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

### Anti-Patterns to Avoid

- **Per-page sessionStorage guard:** The current pattern in `LandlordDashboard.jsx` lines 37-42. Must be removed entirely — not refactored, removed. The guard is now at the router level.
- **`using (true)` RLS policies on financial tables:** These exist in `001_initial_schema.sql` lines 296-338. Migration 003 must drop and replace them. Do not leave placeholder policies that allow all authenticated reads.
- **Checking landlord role inside a component with `useEffect`:** The guard runs before the component renders. Never do auth redirects in `useEffect` — content flashes before the redirect fires.
- **Storing `propertyId` from URL as the sole authorization boundary:** URL params are navigation context, not access control. The `is_landlord()` RLS function is the access control boundary.
- **Fetching `landlord_code` from properties service:** After migration 003, this column is nulled. The `propertiesService.list()` still does `select('*')` which is fine — the column will return null.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Magic link email sending | Custom SMTP or token generation | `supabase.auth.signInWithOtp({ email })` | Supabase handles token generation, expiry, secure delivery. Rolling this manually reintroduces the exact class of vulnerability being fixed. |
| Role checking in component code | `if (user.role === 'landlord')` guards scattered in pages | `LandlordGuard` wrapping route subtree + Supabase RLS | Component-level checks are bypassable. Defense must be at both route and data layers. |
| Property ownership validation | Custom JavaScript checking `if (user.propertyIds.includes(propertyId))` | Supabase RLS policy with `property_id = any(select property_ids from profiles where id = auth.uid())` | Client-side ownership check can be bypassed in devtools. Server-side RLS is the only reliable boundary. |
| Session storage of auth state | `sessionStorage.setItem('landlord_property_id', ...)` | Supabase session (JWT in localStorage via supabase-js) | The existing sessionStorage pattern is the vulnerability being replaced. Supabase manages session persistence securely. |
| Audit log timestamp generation | `new Date().toISOString()` in application code | `performed_at timestamptz default now()` (database default) | Database timestamps are authoritative and cannot be spoofed by client-side clock manipulation. Send `performed_at` as application-side for display; rely on DB `now()` for the canonical record. |

**Key insight:** Every hand-rolled solution in this domain either leaks secrets to the client, creates a single-point enforcement gap, or duplicates logic that the existing stack already handles securely.

---

## Runtime State Inventory

This phase replaces client-side auth state. The following runtime state must be accounted for:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `landlord_code` column on `properties` table — 7 seed rows currently have no landlord_code set (all null in seed data) | Migration 003: null + trigger prevents future writes. No data migration needed since column is already null in current data. |
| Stored data | Supabase `auth.users` — no landlord accounts exist yet (auth system just set up) | Landlord accounts created via admin invite flow (D-04). No existing sessions to disrupt. |
| Stored data | `profiles` table — does not exist yet | Migration 003 creates it. First landlord accounts will be created after migration ships. |
| Stored data | `audit_log` table — does not exist yet | Migration 003 creates it. Coverage starts from phase 1 deployment date. UI must label "Audit history tracked from [date]". |
| Live service config | sessionStorage key `landlord_property_id` — currently set by `LandlordLogin.jsx` line 36 | Code removal (no data migration). Once migration ships, the old code path is gone and any existing sessionStorage values are inert. |
| Live service config | localStorage key `active_property_id` — does not exist yet (PropertyContext is new) | New code creates it on first property switch. No existing data. |
| OS-registered state | None — no OS-level registrations | None |
| Secrets/env vars | `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — already in use. Magic link requires Supabase auth to be configured (redirect URLs in Supabase Dashboard). | Supabase Dashboard config required: add app URL to Authentication → URL Configuration → Redirect URLs. Not a code change. |
| Build artifacts | No stale build artifacts from rename/refactor | None |

**Key runtime note:** Because no landlord Supabase accounts exist yet (the only landlord auth was via shared `landlord_code`), there are no active landlord sessions to disrupt (D-05 clean cutover is achievable). The transition is: deploy migration 003 + new auth code → admin sends landlord invites → landlords click invite → create accounts → use magic link thereafter.

---

## Common Pitfalls

### Pitfall 1: Accounting and LandlordRequests Have No Guard (Confirmed in Code)

**What goes wrong:** `Accounting.jsx` and `LandlordRequests.jsx` have zero auth protection — any URL visitor can access financial data with a valid `?propertyId=`. Confirmed by code inspection (lines 1-30 of both files show no auth check).

**Why it happens:** Guard was added only to `LandlordDashboard.jsx` (lines 37-42) and never copied to the other landlord pages.

**How to avoid:** The LandlordGuard Outlet wrapper in App.jsx covers all three routes in one implementation. Do not attempt to fix per-page — use the centralized guard.

**Warning signs:** If you see `sessionStorage` or role-check code inside a page component's `useEffect`, it means the router-level guard is missing.

---

### Pitfall 2: pages.config.js Routing Conflicts

**What goes wrong:** `pages.config.js` auto-registers ALL pages including landlord pages in the flat `.map()` loop in `App.jsx`. If you add a `<Route element={<LandlordGuard />}>` wrapper without excluding landlord pages from the `.map()`, both an unguarded route and a guarded route exist for the same path. React Router will match whichever comes first.

**Why it happens:** CLAUDE.md states pages.config.js is auto-generated and must not be manually edited. But the import of the page components is needed. The solution is to filter landlord pages out of the map loop in `App.jsx`, then register them explicitly under the guard.

**How to avoid:** In `AuthenticatedApp`, filter the PAGES object to exclude `LandlordDashboard`, `LandlordRequests`, and `Accounting` from the `.map()`. Register those three explicitly under the `LandlordGuard` route element.

```jsx
const LANDLORD_PAGES = ['LandlordDashboard', 'LandlordRequests', 'Accounting'];
// In the map:
{Object.entries(Pages)
  .filter(([path]) => !LANDLORD_PAGES.includes(path))
  .map(([path, Page]) => (...))}
// Then separately:
<Route element={<LandlordGuard />}>
  {LANDLORD_PAGES.map(name => (
    <Route key={name} path={`/${name}`} element={...} />
  ))}
</Route>
```

---

### Pitfall 3: TanStack Query Cache Contamination on Property Switch

**What goes wrong:** A landlord switches from property A to property B. Query keys like `['businesses', propertyId]` still hold cached data from property A because the `propertyId` variable in the component is a stale closure. New data renders incorrectly — financial totals or tenant counts from the wrong property appear without any error.

**Why it happens:** If `activePropertyId` updates in `PropertyContext` but the query key in a component was captured at mount time, the component doesn't know to refetch.

**How to avoid:** Two defenses:
1. `switchProperty` calls `queryClient.invalidateQueries()` (all queries) atomically before setting new `activePropertyId`.
2. All landlord page query keys must include `activePropertyId` from `useProperty()` not from URL params. Example: `queryKey: ['leases', activePropertyId]` not `queryKey: ['leases', propertyId]` where `propertyId` is from `URLSearchParams`.

**Warning signs:** A brief flash of old property data when switching. Stale totals in summary cards.

---

### Pitfall 4: Magic Link Redirect Configuration

**What goes wrong:** Supabase sends the magic link, landlord clicks it, and gets an error page because the redirect URL is not whitelisted in the Supabase Dashboard. Or the redirect goes to the right URL but the session is not picked up because the `onAuthStateChange` listener was not mounted yet.

**Why it happens:** Supabase requires explicit redirect URL whitelisting. The `AuthContext` `onAuthStateChange` listener is mounted in a `useEffect` — if the browser navigates to a new URL before React mounts, the session may not be detected.

**How to avoid:**
- Add app URL(s) to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs before any invites are sent.
- The `supabase.auth.getSession()` call in `checkAppState` (already in `AuthContext.jsx` lines 45-55) handles the case where the session was established before the listener mounted — this is the correct recovery path and is already implemented.
- For local development, add `http://localhost:5173` to the redirect URL whitelist.

---

### Pitfall 5: Infinite Recursion in RLS Policies

**What goes wrong:** An RLS policy on `profiles` table queries the `profiles` table to check if the current user is a landlord. This creates infinite recursion: evaluating the policy requires running the policy.

**Why it happens:** Naive approach to checking `profiles.role` inside a `profiles` RLS policy.

**How to avoid:** The `is_landlord()` helper function uses `security definer` which runs as the function owner (bypassing RLS for that internal query). The `profiles` table policy uses `id = auth.uid()` (a direct auth check, no table join) rather than calling `is_landlord()`. Only the financial table policies use `is_landlord()`.

---

### Pitfall 6: Audit Coverage Boundary Not Labeled in UI

**What goes wrong:** The AuditLog table is created and populated going forward, but records created before Phase 1 deployment show an empty audit trail. A landlord disputes a lease change made before the migration and sees no history. The audit trail "looks done" but only covers post-migration activity.

**Why it happens:** Historical records cannot be retroactively audited from current state (we don't know when changes happened or who made them).

**How to avoid:** The Audit page header must show: "Audit history tracked from [migration date]." Store the migration date as a constant. Do not show an empty state that implies "no changes have been made."

---

## Code Examples

### Supabase Magic Link Send

```javascript
// Source: Supabase official docs — auth.signInWithOtp
const { error } = await supabase.auth.signInWithOtp({
  email: 'landlord@example.com',
  options: {
    emailRedirectTo: `${window.location.origin}/LandlordDashboard`
  }
});
```

### is_landlord() PostgreSQL Helper

```sql
-- Source: Supabase official docs — RLS with helper functions
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
```

### LandlordGuard with Outlet

```jsx
// Source: React Router v6 official docs — Layout Routes
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function LandlordGuard() {
  const { user, isLoadingAuth, isLandlord } = useAuth();
  if (isLoadingAuth) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/LandlordLogin" replace />;
  if (!isLandlord) return <Navigate to="/Welcome" replace />;
  return <Outlet />;
}
```

### queryClient.invalidateQueries on Property Switch

```javascript
// Source: TanStack Query v5 official docs
queryClient.invalidateQueries(); // invalidates all — intentional for property switch
```

### Profiles Table RLS — No Recursion

```sql
-- Profiles: users read only own row (direct auth.uid() check, no join)
create policy "Users can read own profile"
  on profiles for select to authenticated
  using (id = auth.uid()); -- NOT using is_landlord() — avoids recursion risk
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Base44 User `role` field for landlord auth | Supabase `profiles` table with custom `role` column | This project (migrated from Base44 to Supabase, confirmed in MEMORY.md 2026-03-25) | ARCHITECTURE.md patterns referencing `user.role === 'admin'` via Base44 are superseded. Use `profiles.role === 'landlord'` via Supabase. |
| Shared `landlord_code` + sessionStorage | Supabase magic link + profiles role | Phase 1 implementation | Client-side bypass eliminated |
| `base44.entities.*` SDK calls | `supabase.from('table').*` calls | Supabase migration complete | All service files updated; patterns in ARCHITECTURE.md using `base44.entities` do not apply |
| Properties fetched with `select('*')` (includes landlord_code) | Properties fetched with `select('*')` (landlord_code nulled at DB level) | Phase 1 implementation | No service layer change needed; column returns null after migration |

**Deprecated patterns in this codebase:**
- `sessionStorage.getItem('landlord_property_id')` — remove from `LandlordDashboard.jsx`
- `properties.find(p => p.landlord_code === code)` — remove from `LandlordLogin.jsx`
- Base44 SDK references in `ARCHITECTURE.md` — superseded for this project by Supabase

---

## Open Questions

1. **Property ownership enforcement in RLS**
   - What we know: `profiles.property_ids` stores a uuid[] of permitted properties. `is_landlord()` only checks `role = 'landlord'`.
   - What's unclear: Should RLS policies also enforce that a landlord can only read/write data for their own properties (not just any landlord)? E.g., `property_id = any(select property_ids from profiles where id = auth.uid())`.
   - Recommendation: For the current number of landlords (likely one management company = one set of properties), the `is_landlord()` check is sufficient. Cross-landlord isolation can be added in a future migration if multiple independent landlords are onboarded. Flag as a future hardening item.

2. **Invitation flow implementation**
   - What we know: D-04 says admin sends invite, landlord creates Supabase account. Supabase supports `supabase.auth.admin.inviteUserByEmail()`.
   - What's unclear: Is the invitation workflow a UI in the admin panel, or a manual operation? This is not specified in CONTEXT.md.
   - Recommendation: Out of scope for Phase 1 code. The planner should include a task to document the manual admin steps (Supabase Dashboard → Authentication → Users → Invite) with no code needed.

3. **Session handling after magic link in production**
   - What we know: Supabase magic link uses PKCE flow; `onAuthStateChange` picks up the session; `getSession()` provides recovery.
   - What's unclear: The `emailRedirectTo` needs to be the exact deployed URL. If the app is served from a non-root path, this requires adjustment.
   - Recommendation: Set `emailRedirectTo: window.location.origin` and let the app's routing handle the post-auth navigation based on user role.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | DB migrations (003_landlord_auth.sql) | Yes | 2.67.1 | Run SQL directly in Supabase Dashboard SQL editor |
| Node.js | npm / Vite build | Yes | (present per git status npm scripts) | — |
| Supabase project | All auth + RLS | Assumed (env vars already configured in supabaseClient.js) | 2.100.0 client | — |
| `VITE_SUPABASE_URL` env var | supabaseClient.js | Assumed set (app runs) | — | Blocks execution if missing |
| `VITE_SUPABASE_ANON_KEY` env var | supabaseClient.js | Assumed set (app runs) | — | Blocks execution if missing |

**Missing dependencies with no fallback:**
- Supabase project must be accessible with valid env vars — if missing, the entire auth layer fails. Current state appears operational based on git status showing service files working.

**Missing dependencies with fallback:**
- Supabase CLI: if not available for migration apply, SQL can be run manually in the Supabase Dashboard SQL editor.

---

## Project Constraints (from CLAUDE.md)

The following CLAUDE.md directives are binding. The planner must verify compliance:

| Directive | Implication for Phase 1 |
|-----------|-------------------------|
| Must work within Base44 BaaS ecosystem (or Supabase per MEMORY.md migration) | Confirmed: all patterns use Supabase — no custom backend server needed |
| Brownfield project — preserve existing functionality | LandlordLogin page kept (rewritten, not deleted); all tenant-facing flows unchanged; existing RLS policies for businesses/posts/recommendations preserved |
| No custom CI/CD — deployed via Base44 Builder / Vite build | Migration SQL applied manually to Supabase; no automated migration runner needed |
| Brand identity: navy-to-steel-blue gradient, "Where Tenants Connect" | LandlordLogin redesign maintains existing brand treatment per UI-SPEC.md |
| Do not manually edit `pages.config.js` | Landlord route guard implemented in `App.jsx` by filtering pages, not in pages.config.js |
| PascalCase for components, camelCase for utils/hooks | `LandlordGuard.jsx`, `PropertyContext.jsx` (PascalCase files); `AuditLogger.js` (camelCase utility) |
| Use `@/` prefix for all internal imports | All new files use `@/lib/...`, `@/services/...` etc. |
| `react-hooks/rules-of-hooks: error` lint rule | No conditional hooks; `useProperty()` and `useAuth()` called unconditionally at top of components |
| Error handling: React Query manages async errors; no error callbacks in mutations observed | `writeAudit().catch(() => {})` — audit failure silently swallowed per existing pattern |
| No TypeScript for page/component files — `.jsx` extension | `LandlordGuard.jsx`, `PropertyContext.jsx` — JSX files. `AuditLogger.js` — plain JS utility |
| Start work through a GSD command before using Edit/Write tools | This research is part of the GSD planning workflow |

---

## Validation Architecture

> Skipped: `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`.

---

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection — `src/lib/AuthContext.jsx`, `src/pages/LandlordLogin.jsx`, `src/pages/LandlordDashboard.jsx`, `src/pages/Accounting.jsx`, `src/pages/LandlordRequests.jsx`, `src/App.jsx`, `src/services/supabaseClient.js`, `src/services/properties.js`, `supabase/migrations/001_initial_schema.sql`
- `.planning/research/ARCHITECTURE.md` — architectural patterns (Base44-era patterns noted as superseded by Supabase migration)
- `.planning/research/PITFALLS.md` — confirmed pitfalls 1, 2, 7 against live code
- `.planning/research/STACK.md` — package versions and auth hardening approach
- `.planning/phases/01-security-access-control/01-CONTEXT.md` — all locked decisions (D-01 through D-15)
- `.planning/phases/01-security-access-control/01-UI-SPEC.md` — component inventory, interaction states, copywriting contract
- `supabase/migrations/001_initial_schema.sql` — confirmed RLS enabled, placeholder policies identified

### Secondary (MEDIUM confidence)
- Supabase official docs — `auth.signInWithOtp`, RLS helper functions, `security definer` pattern (patterns well-established in Supabase ecosystem)
- React Router v6 official docs — Layout Routes / Outlet pattern for role-based guards
- TanStack Query v5 official docs — `queryClient.invalidateQueries()` API

### Tertiary (LOW confidence)
- None — all critical claims verified against primary sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed, versions confirmed in package.json
- Architecture: HIGH — patterns verified against live codebase code; Supabase migration already operational
- Pitfalls: HIGH — pitfalls 1, 2, 7 confirmed by direct code inspection; pitfalls 4, 5, 6 verified against Supabase docs patterns
- RLS SQL: MEDIUM — standard PostgreSQL patterns; `is_landlord()` helper is the Supabase-recommended approach but exact syntax should be verified in migration apply step
- landlord_code restriction: MEDIUM — column nulling is the simplest valid approach; Supabase CLS limitation confirmed

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable stack — Supabase and React Router v6 patterns are stable)
