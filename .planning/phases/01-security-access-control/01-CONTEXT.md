# Phase 1: Security & Access Control - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden landlord authentication from client-side sessionStorage code matching to server-validated Supabase role accounts. Protect all landlord routes (Dashboard, Requests, Accounting) at both the UI layer (centralized route guard) and the data layer (Supabase RLS policies). Enable multi-property switching for landlords who manage more than one property. Establish an append-only audit trail for financial and status mutations.

</domain>

<decisions>
## Implementation Decisions

### Landlord Login Flow
- **D-01:** Landlords authenticate via Supabase magic link (passwordless email). No password management needed.
- **D-02:** Keep a separate /LandlordLogin page with landlord-specific branding — do not merge with tenant login flow.
- **D-03:** Landlord role and property associations stored in a `profiles` table (user_id, role, property_ids). Not in user_metadata — the profiles table supports multi-property associations and is queryable via RLS.

### Auth Migration Path
- **D-04:** Existing landlords are onboarded via invitation emails. Admin sends invite, landlord clicks link and creates Supabase account.
- **D-05:** Code-based login is disabled immediately once invitations are sent — no parallel-run window. Clean cutover.
- **D-06:** The `landlord_code` field on the properties table should be removed or access-restricted after migration.

### Multi-Property Switcher
- **D-07:** Property switcher lives in the header navbar as a dropdown — always visible on landlord pages. Similar to Slack/Notion workspace switchers.
- **D-08:** Switching properties stays on the same page — data reloads in place. If on Dashboard, stay on Dashboard with new property data.
- **D-09:** Switcher is hidden if landlord has only one property. Only shown for landlords with 2+ properties.
- **D-10:** Active property is persisted to localStorage. On login, auto-selects last active property.
- **D-11:** Property switch must invalidate TanStack Query cache atomically to prevent stale cross-property data rendering.

### Audit Trail
- **D-12:** Audit trail is landlord-only. Tenants do not see audit entries.
- **D-13:** Audit appears both inline (timeline on individual records) and as a dedicated filterable /audit page.
- **D-14:** Full actor tracking — log user ID, email, and role for every mutation. Not just "a change happened."
- **D-15:** AuditLog is an append-only Supabase table. Entries are never updated or deleted.

### Claude's Discretion
- RLS policy structure and exact SQL for the policies
- PropertyContext React implementation details
- LandlordGuard component internals
- AuditLogger utility module design
- Header dropdown component styling (within existing brand identity)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth & Security
- `docs/PRD.md` — Full reverse-engineered product spec. See "Open Questions & Risks" section for landlord auth gap details and "Suggested Backlog" for P0 security items.
- `.planning/research/ARCHITECTURE.md` — Architecture patterns for LandlordGuard, PropertyContext, and RLS policy design
- `.planning/research/PITFALLS.md` — Pitfall 1 (unguarded accounting routes), Pitfall 2 (propertyId URL substitution), Pitfall 6 (auth migration session disruption), Pitfall 7 (TanStack Query cache contamination)
- `.planning/research/STACK.md` — Supabase RLS + role field documentation, zero new packages needed for auth

### Existing Code (must read before modifying)
- `src/lib/AuthContext.jsx` — Current Supabase auth implementation with useAuth hook
- `src/pages/LandlordLogin.jsx` — Current code-based landlord login (to be replaced)
- `src/pages/LandlordDashboard.jsx` — Only landlord page with sessionStorage check
- `src/pages/Accounting.jsx` — Landlord page with ZERO auth guard
- `src/pages/LandlordRequests.jsx` — Landlord page with ZERO auth guard
- `src/pages.config.js` — Auto-generated page routing (flat routes, no grouping)
- `src/services/supabaseClient.js` — Supabase client setup
- `src/services/properties.js` — Properties service (fetches all properties without RLS)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AuthContext` + `useAuth` hook: Already provides `user`, `isAuthenticated`, `logout`, `isLoadingAuth`. Can be extended with role info from profiles table.
- `supabaseClient`: Direct Supabase JS client ready for RLS-protected queries.
- `queryClientInstance`: TanStack Query client for cache invalidation on property switch.
- shadcn/ui components: Card, Button, Input, Badge, Label — all available for login and switcher UI.
- `UnitLogo` component: Used in current LandlordLogin, reusable in new flow.
- framer-motion: Already used for page animations in LandlordLogin.

### Established Patterns
- **Data fetching**: TanStack Query with `useQuery` and service layer functions (`propertiesService.list()`, etc.)
- **Styling**: Tailwind CSS with brand tokens (`brand-navy`, `brand-slate`, etc.) + shadcn/ui components
- **URL params**: `propertyId` passed as URL search param (`?propertyId=X`), parsed via `URLSearchParams`
- **Page routing**: Flat routes in `pages.config.js`, auto-registered from `./pages/` folder. No nested routes or Outlet wrappers currently.

### Integration Points
- `App.jsx`: Needs route grouping for landlord routes with LandlordGuard wrapping
- `AuthContext`: Needs to fetch and expose landlord role + property associations from profiles table
- `supabaseClient`: RLS policies must be created on properties, leases, invoices, payments, expenses tables
- `LandlordDashboard` nav: Header needs property switcher dropdown added
- All service files: Currently use `supabase.from('table').select('*')` — RLS will automatically scope these without code changes

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for all implementation details.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-security-access-control*
*Context gathered: 2026-03-25*
