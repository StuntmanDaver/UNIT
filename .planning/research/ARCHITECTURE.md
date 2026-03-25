# Architecture Research

**Domain:** Multi-tenant property community SaaS — gap-closure milestone (security, features, quality)
**Researched:** 2026-03-25
**Confidence:** MEDIUM-HIGH (Base44-specific capabilities verified via official docs; integration patterns verified via official/multiple sources; some Base44 internals LOW confidence due to limited public documentation depth)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        React SPA (Browser)                           │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Route Layer  │  │  Auth Layer  │  │ Property Ctx │               │
│  │ (RR v6)      │  │ (AuthContext)│  │ (new)        │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                  │                        │
│  ┌──────┴─────────────────┴──────────────────┴──────────────────┐   │
│  │                    Page Components                             │   │
│  │  (LandlordDashboard, Accounting, LandlordRequests, etc.)       │   │
│  └──────────────────────────┬─────────────────────────────────────┘  │
│                             │                                         │
│  ┌──────────────────────────┴─────────────────────────────────────┐  │
│  │             TanStack Query (server state cache)                  │  │
│  └──────────────────────────┬─────────────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────────┘
                              │ Base44 SDK calls
┌─────────────────────────────┴───────────────────────────────────────┐
│                         Base44 BaaS                                   │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │ Auth + Users │  │  Entities    │  │  Backend Functions       │   │
│  │ (role field) │  │  (RLS rules) │  │  (Deno, TypeScript)      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘   │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  Automations │  │ SendEmail /  │  │  Stripe Integration      │   │
│  │  (entity     │  │ Resend       │  │  (Checkout + webhooks)   │   │
│  │   triggers)  │  │              │  │                          │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `RouteGuard` (new) | Gate access to landlord routes by role; redirect unauthenticated users | React Router v6 `<Outlet>` wrapper component |
| `AuthContext` (extended) | Hold user object with `role` field; expose `isLandlord` / `isTenant` booleans | Extend existing `useAuth` hook |
| `PropertyContext` (new) | Hold active property for multi-property landlord switching; persist across navigation | React Context + localStorage |
| `AuditLogger` (new) | Write audit records to a Base44 `AuditLog` entity on status/financial mutations | Thin wrapper called inside `useMutation.onSuccess` |
| `EmailTrigger` (Base44 Automation) | Fire transactional emails on entity events without frontend involvement | Base44 entity automation → SendEmail/Resend |
| `StripeCheckout` (new) | Redirect to Base44-managed Stripe Checkout; handle success redirect and update Invoice status | Page component using Base44 Stripe flow |
| `ErrorBoundary` (new) | Catch render errors at route segment level; show degraded fallback UI | `react-error-boundary` library wrapping route segments |

---

## Recommended Project Structure

The existing structure is sound. Gap-closure changes are additive and slot into existing layers.

```
src/
├── api/
│   └── base44Client.js          # existing — no change
├── components/
│   ├── accounting/              # existing
│   ├── ui/                      # existing
│   ├── guards/                  # NEW
│   │   ├── LandlordGuard.jsx    # route guard: requires landlord role
│   │   └── PropertyGuard.jsx    # route guard: requires active propertyId
│   └── ErrorBoundary.jsx        # NEW — reusable error boundary
├── lib/
│   ├── AuthContext.jsx          # existing — extend with role awareness
│   ├── PropertyContext.jsx      # NEW — multi-property active context
│   ├── AuditLogger.js           # NEW — thin wrapper for audit writes
│   ├── query-client.js          # existing — no change
│   └── NavigationTracker.jsx    # existing — no change
├── hooks/
│   └── use-mobile.jsx           # existing
├── pages/
│   ├── LandlordLogin.jsx        # existing — migrate to role-based auth
│   ├── LandlordDashboard.jsx    # existing — remove sessionStorage guard
│   ├── LandlordRequests.jsx     # existing — remove inline guard
│   ├── Accounting.jsx           # existing — remove inline guard
│   └── Unauthorized.jsx         # NEW — 403 fallback page
└── App.jsx                      # existing — add guard wrappers to landlord routes
```

### Structure Rationale

- **components/guards/:** Route guards are reusable components, not one-off page logic. Centralising them here mirrors the same pattern used by every major React Router v6 guide and avoids the current per-page `sessionStorage` check duplication.
- **lib/PropertyContext.jsx:** Property switching is orthogonal to auth. It deserves its own context so it can be composed independently with `AuthContext` without coupling.
- **lib/AuditLogger.js:** A single module that all mutations import keeps audit record format consistent and makes the audit trail easy to test in isolation.

---

## Architectural Patterns

### Pattern 1: Role-Based Route Guard via Outlet

**What:** A `LandlordGuard` component wraps all landlord routes in `App.jsx`. It reads the user's `role` field from `AuthContext`, redirects unauthenticated users to login, and redirects non-landlord users to `/Unauthorized`. Uses React Router v6's `<Outlet>` so the guard wraps a route subtree rather than being copy-pasted into each page.

**When to use:** Any time a set of routes requires a specific role or auth state.

**Trade-offs:** Simple and stateless. Does not prevent a determined client from calling Base44 SDK directly — that protection comes from Base44 entity-level RLS rules (see Pattern 2), not from this guard.

**Example:**
```jsx
// src/components/guards/LandlordGuard.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function LandlordGuard() {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/LandlordLogin" replace />;
  if (user.role !== 'landlord') return <Navigate to="/Unauthorized" replace />;

  return <Outlet />;
}

// src/App.jsx — usage
<Route element={<LandlordGuard />}>
  <Route path="/LandlordDashboard" element={<LandlordDashboard />} />
  <Route path="/LandlordRequests" element={<LandlordRequests />} />
  <Route path="/Accounting" element={<Accounting />} />
</Route>
```

---

### Pattern 2: Server-Side Role Validation via Base44 User Role Field + Entity RLS

**What:** The real security boundary sits in Base44, not in the React guard. The approach has two parts:

1. Add a `role` field (values: `tenant` | `landlord`) to the Base44 `User` entity.
2. Configure entity RLS rules on sensitive entities (Lease, RecurringPayment, Invoice, Expense, Payment) to require `user.role === 'landlord'` for Create/Update/Delete operations.

The React guard (Pattern 1) is UX — it prevents navigation to landlord screens. The RLS rule is the actual security enforcement — it prevents SDK calls from non-landlord users from succeeding at the data layer.

**When to use:** Any entity that should only be mutated by landlords.

**Trade-offs:** HIGH confidence that Base44 supports entity-level RLS with user property checks (verified in official docs). The User entity `role` field approach is the recommended Base44 pattern for custom roles. Limitation: Base44 does not support field-level security, only row-level, so RLS rules apply to the whole record.

**Confidence:** MEDIUM — the capability exists, but the exact Rule DSL syntax for `user.role` checks is documented conceptually, not shown as exhaustive code samples. Verify the rule UI during implementation.

---

### Pattern 3: Audit Log Table (not Event Sourcing)

**What:** Write a record to a dedicated Base44 `AuditLog` entity every time a sensitive mutation succeeds. Each record captures: `entity_type`, `entity_id`, `action` (e.g., `status_changed`), `old_value`, `new_value`, `performed_by_user_id`, `performed_at`.

**Why not event sourcing:** Event sourcing rebuilds state from events — it requires a dedicated event store, projections, and replay infrastructure that does not exist in Base44 and would require a custom backend outside the constraint of staying within the BaaS ecosystem. The audit-log-table pattern is sufficient for this use case (human-readable history of who changed what) and implementable as a Base44 entity.

**When to use:** Recommendation/request status changes; Invoice status mutations; Lease and financial record creates/updates/deletes.

**Trade-offs:** Simple to implement; queryable; fits within Base44 entities. Does not allow state replay. If compliance requirements escalate, migrating to full event sourcing is a future option — but premature for this milestone.

**Example:**
```js
// src/lib/AuditLogger.js
import { base44 } from '@/api/base44Client';

export async function writeAudit({ entityType, entityId, action, oldValue, newValue, userId }) {
  return base44.entities.AuditLog.create({
    entity_type: entityType,
    entity_id: entityId,
    action,
    old_value: JSON.stringify(oldValue),
    new_value: JSON.stringify(newValue),
    performed_by_user_id: userId,
    performed_at: new Date().toISOString()
  });
}

// Usage inside useMutation onSuccess:
onSuccess: (data, variables) => {
  writeAudit({
    entityType: 'Recommendation',
    entityId: variables.id,
    action: 'status_changed',
    oldValue: { status: previousStatus },
    newValue: { status: variables.status },
    userId: user.id
  }).catch(() => {}); // audit failure should not block the mutation
}
```

---

### Pattern 4: Multi-Property Context via React Context + localStorage

**What:** A `PropertyContext` holds the `activePropertyId` for the current landlord session. When a landlord with access to multiple properties switches properties, the context updates and all `useQuery` hooks that depend on `propertyId` automatically refetch. The active property id is persisted to `localStorage` so it survives page refreshes.

**Why not URL params alone:** URL params already convey `propertyId` for individual pages, but a landlord switching between properties needs a "home" context that pre-fills the property selector across all landlord pages without losing that context on navigation.

**When to use:** Landlords with multiple properties. Tenant flows do not use this context.

**Example:**
```jsx
// src/lib/PropertyContext.jsx
const PropertyContext = createContext();

export function PropertyProvider({ children }) {
  const [activePropertyId, setActivePropertyId] = useState(
    () => localStorage.getItem('active_property_id')
  );

  const switchProperty = (propertyId) => {
    localStorage.setItem('active_property_id', propertyId);
    setActivePropertyId(propertyId);
  };

  return (
    <PropertyContext.Provider value={{ activePropertyId, switchProperty }}>
      {children}
    </PropertyContext.Provider>
  );
}

export const useProperty = () => useContext(PropertyContext);
```

TanStack Query cache keys that include `propertyId` will automatically invalidate when the id changes, driving data refetch across pages.

---

### Pattern 5: Email Notifications via Base44 Automations (No Frontend Code)

**What:** Email notifications for key events (new request submitted, status changed to resolved, invoice generated) are implemented entirely as Base44 entity automations — not as frontend code making API calls after mutations.

The flow: mutation succeeds → Base44 entity updated → Base44 automation fires → backend function calls SendEmail (built-in) or Resend (external, recommended for non-user recipients).

**Why not trigger from frontend:** Frontend-triggered emails require a dedicated backend function call from `useMutation.onSuccess`, which fails silently if the user navigates away or loses connectivity. Entity automations run server-side on the database event, regardless of frontend state.

**Automation configuration (Base44 dashboard):**
- Trigger entity: `Recommendation`, event: `update`
- Condition: `status === 'resolved' || status === 'in_progress'`
- Action: call backend function → SendEmail to `recommendation.submitted_by_email`

**Built-in SendEmail limitation:** Base44's native `SendEmail` only sends to registered app users. For notifications to landlords who may not have a Base44 user account, Resend is required. Use Resend for all transactional emails to remove this constraint.

**Confidence:** HIGH — verified in official Base44 docs that entity automations trigger backend functions on create/update/delete. Resend integration verified in official Base44 email docs.

---

### Pattern 6: Stripe Integration via Base44 Checkout + Backend Function Webhook

**What:** Stripe integration uses Base44's built-in Stripe Checkout flow (released January 2026). The architecture is:

1. Frontend creates/updates an Invoice record with `status: 'pending'`.
2. Frontend redirects to Base44-managed Stripe Checkout with the invoice amount.
3. On payment success, Stripe redirects back to a `/PaymentSuccess` page.
4. The success page updates the Invoice `status` to `paid` and writes an audit record.
5. A Base44 backend function is configured as a Stripe webhook handler for out-of-band confirmations (e.g. delayed payment methods).

**Why not build custom Stripe integration:** Base44 has a native Stripe integration on the Builder plan that handles key/secret management and checkout session creation. Building a custom payment intent flow from scratch requires a backend server outside Base44's ecosystem, violating the tech stack constraint.

**Important limitation:** Base44 automations only fire while a user is active in the app. Stripe webhooks for background events (failed charges, subscription renewals) require a dedicated Base44 backend function endpoint, not a Base44 automation. This is supported via Deno backend functions with `asServiceRole` for database writes.

**Confidence:** MEDIUM — Base44 Stripe integration existence and flow verified in official docs. Webhook behavior limitation is explicitly documented. Exact `asServiceRole` usage with entity writes is described conceptually.

---

### Pattern 7: Test Architecture — Vitest + React Testing Library + MSW + Playwright

**What:** Three-layer test strategy fitting the Vite + React SPA context:

| Layer | Tool | What it tests |
|-------|------|--------------|
| Unit | Vitest | Utility functions (`AuditLogger`, route guard logic, `PropertyContext` state transitions) |
| Component/Integration | Vitest + React Testing Library + MSW | Page components with mocked Base44 API responses |
| E2E | Playwright | Critical user paths: landlord login, status change, invoice creation |

**MSW for Base44 mocking:** MSW intercepts the HTTP calls the Base44 SDK makes at the network layer, so components render against controlled fake data without requiring a live Base44 app. This is the same pattern used for Supabase and other BaaS providers with REST-based SDKs.

**Why Playwright over Cypress for E2E:** Playwright has superior parallel test execution, does not require a browser bundle to be embedded in the test runner, and integrates cleanly with Vite's dev server via `webServer` config. Both are valid — Playwright is the stronger long-term bet at current adoption velocity.

**Test file placement:**
```
src/
├── lib/
│   ├── AuditLogger.js
│   └── AuditLogger.test.js       # unit test beside source
├── components/guards/
│   ├── LandlordGuard.jsx
│   └── LandlordGuard.test.jsx    # component test beside source
tests/
└── e2e/
    ├── landlord-login.spec.ts
    ├── request-status-change.spec.ts
    └── invoice-creation.spec.ts
```

---

### Pattern 8: Error Boundaries at Route Segment Level

**What:** Wrap each major page group with a React error boundary so that a crash in one page does not bring down the entire app. Use the `react-error-boundary` library (maintained by the React team) rather than implementing a custom class component.

**Placement strategy:** One error boundary per route segment (landlord routes, tenant routes, public routes). Do not wrap individual components — this is granular enough for the error to be isolated without the overhead of per-component boundaries.

**Offline fallback:** TanStack Query's `staleTime` and `cacheTime` configuration provides a basic offline story — stale data renders from cache during brief disconnects. For a "full offline" experience, service workers are out of scope for this milestone. The meaningful win here is setting appropriate `staleTime: 5 * 60 * 1000` (5 minutes) on key queries so the UI doesn't go blank during transient network issues.

**Example:**
```jsx
// src/App.jsx
import { ErrorBoundary } from 'react-error-boundary';
import ErrorFallback from '@/components/ErrorBoundary';

// Wrap landlord route group
<Route element={
  <ErrorBoundary FallbackComponent={ErrorFallback} onReset={resetQueryCache}>
    <LandlordGuard />
  </ErrorBoundary>
}>
  <Route path="/LandlordDashboard" element={<LandlordDashboard />} />
  ...
</Route>
```

---

## Data Flow

### Auth and Role Check Flow

```
App loads
  → AuthProvider reads Base44 token
  → base44.auth.me() returns user object (includes role field)
  → AuthContext sets user.role
  → LandlordGuard reads user.role
      → role === 'landlord' → render <Outlet> (page proceeds)
      → role !== 'landlord' → <Navigate to="/Unauthorized">
      → no user → <Navigate to="/LandlordLogin">
```

### Status Change + Audit Flow

```
Landlord updates Recommendation status
  → useMutation calls base44.entities.Recommendation.update(id, { status })
  → Base44 RLS rule validates user.role === 'landlord'
      → rejected → error toast shown, no audit written
      → accepted →
          → onSuccess: queryClient.invalidateQueries(['recommendations'])
          → onSuccess: writeAudit({ action: 'status_changed', ... })
          → Base44 Automation detects entity update
          → Automation calls backend function → Resend email to tenant
```

### Multi-Property Switch Flow

```
Landlord clicks "Switch Property" in navbar
  → PropertyContext.switchProperty(newPropertyId)
  → localStorage updated
  → activePropertyId state updates
  → All useQuery hooks with queryKey [..., activePropertyId] invalidated
  → Page data refetches for new property
  → URL param updated to match (navigation side effect)
```

### Invoice Payment Flow

```
Landlord clicks "Collect Payment" on Invoice
  → Invoice record set to status: 'awaiting_payment'
  → Frontend redirects to Base44 Stripe Checkout with amount
  → User completes Stripe Checkout
  → Stripe redirects to /PaymentSuccess?invoiceId=xxx
  → PaymentSuccess page: base44.entities.Invoice.update(id, { status: 'paid' })
  → writeAudit({ action: 'invoice_paid', ... })
  → [background] Stripe webhook → Base44 backend function → confirms/reconciles
```

### Email Notification Flow

```
Recommendation status changes to 'resolved'
  → Base44 detects entity update (server-side)
  → Automation trigger fires (no frontend involvement)
  → Backend function executes
  → Resend API call → transactional email delivered to tenant
```

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Stripe | Base44 native Checkout flow (Builder plan required) | Primary flow is redirect-based Checkout. Backend function endpoint for webhook fallback. Do NOT call Stripe directly from frontend — all secrets stay server-side. |
| Resend | Base44 backend function + Resend HTTP API | Call from automations or backend functions. API key stored as Base44 environment secret. Use for all transactional emails to avoid Base44 native email's user-only limitation. |
| MSW (test only) | Network-layer interceptor in Vitest setup | Intercepts Base44 SDK HTTP calls. No production footprint. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `AuthContext` ↔ `LandlordGuard` | React Context read | Guard reads `user.role` via `useAuth()`. No props drilling. |
| `PropertyContext` ↔ Page components | React Context read | All landlord pages use `useProperty()` to get `activePropertyId`. Pages should derive from context, not rely solely on URL param. |
| `useMutation` ↔ `AuditLogger` | Direct function call in `onSuccess` | Audit write is fire-and-forget. Failure is caught and silently swallowed — audit failure must not block the primary mutation UI flow. |
| `Page components` ↔ `Base44 entities` | Base44 SDK via TanStack Query | No change from current pattern. The SDK calls are the only channel — never call Base44 REST endpoints directly from components. |
| Frontend ↔ Stripe | Base44-managed redirect only | Frontend never holds Stripe secret keys. The only frontend-to-Stripe surface is the redirect URL and the success/cancel redirect back. |

---

## Build Order (Phase Dependency Implications)

The components have dependency constraints that dictate build order:

**Build first — blocking everything else:**
1. **User role field in Base44** — Adding `role` field to the Base44 User entity is a prerequisite for all auth hardening, route guards, and RLS rules. Nothing else in the security stream can be validated until this exists.
2. **`AuthContext` role awareness** — Extend `useAuth` to expose `isLandlord`. All guards depend on this.

**Build second — unblocked after role field exists:**
3. **`LandlordGuard` + `PropertyGuard`** — Depend on `AuthContext` role field.
4. **Base44 entity RLS rules** — Configured in Base44 dashboard; depend on role field existing on User entity.
5. **`AuditLog` entity in Base44** — Create the entity in Base44; depends on nothing but needs to exist before `AuditLogger.js` can write to it.

**Build third — unblocked after guards and audit exist:**
6. **`AuditLogger.js` + mutation integration** — Depends on AuditLog entity existing.
7. **`PropertyContext`** — Independent of auth hardening; can be built in parallel with guards, but should come after basic auth is stable since it lives in the landlord session layer.

**Build fourth — independent streams:**
8. **Base44 Automations (email triggers)** — No frontend code changes. Configure in Base44 dashboard after Resend API key is set up. Independent of all above.
9. **Stripe Checkout integration** — Depends on Invoice entity having `status` field. Independent of auth hardening.
10. **Error boundaries** — Pure frontend; independent of all other streams.
11. **Test suite** — Should be written alongside each stream above, not deferred to end.

---

## Anti-Patterns

### Anti-Pattern 1: Per-Page sessionStorage Guard

**What people do:** Each landlord page checks `sessionStorage.getItem('landlord_property_id')` independently and redirects to login if absent.

**Why it's wrong:** The check is duplicated across `LandlordDashboard`, `LandlordRequests`, and `Accounting`. Adding a new landlord page means remembering to copy the guard. SessionStorage is trivially writable by any JavaScript running in the page. This is the current state of the codebase and the primary security gap.

**Do this instead:** Use `LandlordGuard` wrapping the route subtree (Pattern 1). Remove all per-page `sessionStorage` checks once `role` field is live in Base44.

---

### Anti-Pattern 2: Triggering Emails from `useMutation.onSuccess`

**What people do:** Call a "send email" backend function inside `useMutation.onSuccess` in the component.

**Why it's wrong:** The success callback can be skipped if the component unmounts before it fires (e.g., user navigates away immediately after submitting). It introduces a second failure mode — if the email call fails, the mutation was already committed. Mixing email logic into page components pollutes the presentation layer.

**Do this instead:** Use a Base44 entity automation that fires on the database event server-side. The email trigger is decoupled from the frontend entirely.

---

### Anti-Pattern 3: Calling Stripe APIs from the React Frontend

**What people do:** Import the Stripe secret key into the frontend (via env vars) and call Stripe's API directly from component code.

**Why it's wrong:** Secret keys exposed in a browser bundle can be extracted. Stripe's security model explicitly requires all Payment Intent creation to happen server-side.

**Do this instead:** Use Base44's native Stripe Checkout integration (which manages keys server-side) or create amounts/sessions in a Base44 backend function with `asServiceRole`.

---

### Anti-Pattern 4: Treating Route Guards as the Only Security Layer

**What people do:** Implement `LandlordGuard` and consider auth hardening complete.

**Why it's wrong:** React route guards are client-side JavaScript. Any user can open devtools, bypass the guard, and invoke `base44.entities.Lease.create(...)` directly from the console. The guard is UX, not security.

**Do this instead:** Guards + Base44 entity RLS rules together. The guard prevents navigation; the RLS rule prevents data access. Both are required.

---

### Anti-Pattern 5: Skipping Audit Writes on Mutation Failure

**What people do:** Write audit records only when mutations succeed, with no audit for failed attempts.

**Why it's wrong:** For a financial system, failed mutations (especially if they represent access-denied attempts) are as important to track as successful ones.

**Do this instead:** For P0 security milestone scope, `onSuccess` audit is acceptable to start. Flag in `AuditLogger` design docs that failed-attempt logging is a future enhancement when compliance requirements clarify.

---

## Scaling Considerations

This app's scale constraints are property-count and tenant-count driven, not internet-scale. The architecture decisions here are validated for 0-10K users.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 users (current) | Existing architecture + patterns above sufficient |
| 100-1K users | Tune TanStack Query `staleTime` to reduce redundant Base44 reads; add pagination to directory and recommendation lists |
| 1K-10K users | Base44 entity-level indexes for `property_id` queries; consider splitting AuditLog to a separate Base44 app or external logging service if it grows large |
| 10K+ users | At this scale, re-evaluate whether Base44 entity queries are fast enough for accounting reports; add a dedicated reporting view or cache layer. This scale is out of scope for v1. |

---

## Sources

- [Base44 Backend Functions Overview](https://docs.base44.com/developers/backend/resources/backend-functions/overview) — Deno runtime, auth passthrough, asServiceRole for webhooks
- [Base44 Managing Security Settings](https://docs.base44.com/Setting-up-your-app/Managing-security-settings) — Entity RLS rules, user property checks, custom role field pattern
- [Base44 Sending Emails](https://docs.base44.com/documentation/building-your-app/sending-emails) — Built-in SendEmail vs Resend; user-only limitation on built-in
- [Base44 Automations](https://docs.base44.com/developers/backend/resources/backend-functions/automations) — Entity event triggers (create/update/delete)
- [Base44 Stripe Integration](https://docs.base44.com/documentation/setting-up-your-app/setting-up-payments) — Checkout flow, webhook limitations, Builder plan requirement
- [React Router v6 Protected Routes — Robin Wieruch](https://www.robinwieruch.de/react-router-private-routes/) — Outlet-based guard pattern
- [React Router v6 Auth — LogRocket](https://blog.logrocket.com/authentication-react-router-v6/) — Centralized auth context + route guard composition
- [Role-Based Auth React Router v6 — Adarsha Acharya](https://www.adarsha.dev/blog/role-based-auth-with-react-router-v6) — Role-based guard redirect
- [React Testing Library + MSW + Vitest — Medium](https://medium.com/front-end-weekly/testing-react-applications-the-easy-way-with-testing-library-msw-and-vitest-using-a-sample-932916433203) — BaaS mocking pattern
- [Testing React with Supabase via MSW — Herman Nygaard](https://nygaard.dev/blog/testing-supabase-rtl-msw) — Pattern directly applicable to Base44 SDK mocking
- [Playwright vs Cypress 2025 — frugaltesting](https://www.frugaltesting.com/blog/playwright-vs-cypress-the-ultimate-2025-e2e-testing-showdown) — E2E framework comparison
- [Event Sourcing vs Audit Log — Kurrent](https://www.kurrent.io/blog/event-sourcing-audit) — Why audit log table is sufficient for this use case

---

*Architecture research for: UNIT — multi-tenant property community SaaS (gap-closure milestone)*
*Researched: 2026-03-25*
