# Architecture

> Generated: 2026-03-25 | Focus: arch

## Overview

UNIT is a React single-page application backed by Supabase (PostgreSQL + Auth + Storage). It follows a page-driven architecture where each route maps to a page component that orchestrates data fetching via a thin service layer over the Supabase JS client. The application recently migrated from Base44 BaaS to Supabase, establishing a clear separation between UI components and data access through `src/services/`.

## Pattern Overview

**Overall:** Page-driven SPA with service layer abstraction over Supabase

**Key Characteristics:**
- Filesystem-based route auto-registration via `src/pages.config.js`
- React Query (TanStack Query) for all server state management and caching
- Thin service layer wrapping Supabase client calls (`src/services/`)
- React Context for auth state only; no global state management library
- No Layout wrapper component -- pages compose their own headers and navigation
- Property-scoped data model -- almost all queries filter by `property_id`
- Dual user roles: tenant (Supabase auth) and landlord (code-based sessionStorage auth)

## Layers

### Presentation Layer (Pages + Components)

- **Purpose:** User-facing UI, page composition, and user interaction handling
- **Location:** `src/pages/`, `src/components/`, `src/components/accounting/`, `src/components/ui/`
- **Contains:** 12 page components, 16 feature components, 5 accounting components, 49 UI primitives
- **Depends on:** React Query hooks, service layer, AuthContext, Supabase client (direct calls for auth), UI component library
- **Used by:** React Router (via `src/pages.config.js`) for routing

### Service Layer (Data Access)

- **Purpose:** Abstract Supabase database operations into domain-specific APIs
- **Location:** `src/services/`
- **Contains:** 11 service modules exporting object literals with async CRUD methods
- **Depends on:** `src/services/supabaseClient.js` (Supabase JS client singleton)
- **Used by:** Page components and feature components via React Query `queryFn` / `mutationFn`
- **Pattern:** Each service exports a named object (e.g., `businessesService`) with methods like `filter()`, `getById()`, `create()`, `update()`, `delete()`

### State Management Layer

- **Purpose:** Manage server state caching/synchronization and auth state
- **Location:** `src/lib/query-client.js`, `src/lib/AuthContext.jsx`
- **Contains:** QueryClient configuration, AuthProvider + `useAuth` hook
- **Depends on:** `@tanstack/react-query`, `src/services/supabaseClient.js`
- **Used by:** All page components for data operations; `src/App.jsx` for provider wrapping

### Infrastructure Layer

- **Purpose:** Shared utilities, routing config, brand constants, app initialization
- **Location:** `src/utils/`, `src/lib/`, `src/hooks/`, `src/pages.config.js`
- **Contains:** `createPageUrl()` utility, `cn()` class merger, brand color definitions, mobile breakpoint hook, navigation tracking
- **Depends on:** React Router, service layer
- **Used by:** All page and feature components

### UI Component Library

- **Purpose:** Reusable, styled building blocks based on Radix UI primitives
- **Location:** `src/components/ui/` (49 files, ~4000 lines total)
- **Contains:** Radix UI wrappers styled with Tailwind CSS and CVA variants
- **Depends on:** Radix UI packages, `class-variance-authority`, `tailwind-merge`, `clsx`
- **Used by:** All page and feature components
- **Note:** These are generated/scaffolded shadcn/ui components; do not manually edit

## Data Flow

### Typical Page Data Flow

```
URL (with ?propertyId=xxx)
  -> Page component extracts URL params via `new URLSearchParams(window.location.search)`
  -> useQuery() calls service methods (e.g., `propertiesService.getById(propertyId)`)
  -> Service method calls `supabase.from('table').select('*').eq('property_id', propertyId)`
  -> Supabase JS client sends HTTP request to Supabase REST API
  -> Response cached in React Query with queryKey like ['businesses', propertyId]
  -> Page renders data via feature components
```

### Mutation Flow (Create/Update)

```
User interaction (form submit, button click)
  -> useMutation() wraps service method call (e.g., `postsService.create(data)`)
  -> Service method calls `supabase.from('table').insert(data).select().single()`
  -> On success: `queryClient.invalidateQueries({ queryKey: [...] })` triggers refetch
  -> Side effects: notification creation for other users (done inline in mutation)
  -> Toast notification shown to user
```

### State Management Strategy

| State Type | Mechanism | Location |
|------------|-----------|----------|
| Server state (DB data) | React Query (`useQuery` / `useMutation`) | Page components |
| Auth state | React Context (`AuthProvider` / `useAuth`) | `src/lib/AuthContext.jsx` |
| UI state (modals, filters, tabs) | `useState` | Individual page/component |
| URL state (propertyId, tab, id) | Query parameters via `URLSearchParams` | Page components |
| Landlord session | `sessionStorage.getItem('landlord_property_id')` | `src/pages/LandlordDashboard.jsx`, `src/pages/Directory.jsx` |

### React Query Configuration

Configured in `src/lib/query-client.js`:
- `refetchOnWindowFocus: false` -- no automatic background refetches
- `retry: 1` -- single retry on failure

Common query key patterns:
- `['properties']` -- all properties list
- `['property', propertyId]` -- single property
- `['businesses', propertyId]` -- businesses for a property
- `['posts', propertyId]` -- posts for a property
- `['currentUser']` -- authenticated user from Supabase session
- `['leases', propertyId]` -- leases for a property
- `['recommendations', propertyId]` -- recommendations for a property

## Authentication Architecture

### Dual Auth Model

The application has two distinct authentication paths:

**1. Tenant Authentication (Supabase Auth)**
- Provider: Supabase Auth service
- Implementation: `src/lib/AuthContext.jsx` wraps `supabase.auth.onAuthStateChange()`
- Session: Managed by Supabase JS client (auto-persisted in localStorage)
- User object: Supabase `auth.users` record with `.email` used as business ownership key
- Protected routes: `AuthenticatedApp` in `src/App.jsx` checks `isAuthenticated` before rendering

**2. Landlord Authentication (Code-based)**
- Provider: Client-side code matching against `properties.landlord_code` column
- Implementation: `src/pages/LandlordLogin.jsx` compares input code to property records fetched from Supabase
- Session: `sessionStorage.setItem('landlord_property_id', propertyId)`
- Guard: `src/pages/LandlordDashboard.jsx` checks sessionStorage in `useEffect`
- Security note: Landlord codes are fetched client-side and compared in the browser; no server-side verification

### Auth State Flow

```
App mounts
  -> AuthProvider calls supabase.auth.getSession()
  -> onAuthStateChange listener registered
  -> If session exists: sets user + isAuthenticated = true
  -> If no session: isAuthenticated = false
  -> isLoadingAuth set to false
  -> AuthenticatedApp renders based on auth state:
     - isLoadingAuth=true: spinner
     - authError.type='user_not_registered': UserNotRegisteredError component
     - authError.type='auth_required': redirect to /LandlordLogin
     - otherwise: render Routes
```

### AuthContext Values Provided

```javascript
// From src/lib/AuthContext.jsx
{
  user,                    // Supabase user object or null
  isAuthenticated,         // boolean
  isLoadingAuth,           // boolean
  isLoadingPublicSettings, // boolean (always resolves quickly -- no remote call)
  authError,               // { type: string, message: string } or null
  appPublicSettings,       // static object { id: 'unit-app', public_settings: {} }
  logout,                  // async (shouldRedirect = true) => void
  navigateToLogin,         // () => void (redirects to /LandlordLogin)
  checkAppState            // async () => void (re-check session)
}
```

### Current User Pattern in Pages

Pages that need the current user query Supabase auth directly (not via AuthContext):
```javascript
// Repeated in: Community.jsx, Recommendations.jsx, MyCard.jsx, Register.jsx, PageNotFound.jsx
const { data: user } = useQuery({
  queryKey: ['currentUser'],
  queryFn: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
    return null;
  }
});
```

## Routing Architecture

### Auto-Registration System

- `src/pages.config.js` is auto-generated from files in `src/pages/`
- Each `.jsx` file in `src/pages/` becomes a route at `/<FileName>`
- Main page configured as `"Welcome"` (renders at `/`)
- **Do not manually edit** `src/pages.config.js` except for `mainPage` value

### Route Map

| Route | Page Component | Auth Required | Property Scoped |
|-------|---------------|---------------|-----------------|
| `/` | `src/pages/Welcome.jsx` | No (public landing) | No |
| `/Register` | `src/pages/Register.jsx` | No | Yes (`?propertyId`) |
| `/Community` | `src/pages/Community.jsx` | Yes (implied) | Yes (`?propertyId`) |
| `/Directory` | `src/pages/Directory.jsx` | Yes (implied) | Yes (`?propertyId`) |
| `/Recommendations` | `src/pages/Recommendations.jsx` | Yes (implied) | Yes (`?propertyId`) |
| `/MyCard` | `src/pages/MyCard.jsx` | Yes | Optional (`?businessId`) |
| `/Profile` | `src/pages/Profile.jsx` | Yes | No (`?id` = businessId) |
| `/BrowseProperties` | `src/pages/BrowseProperties.jsx` | No | No |
| `/LandlordLogin` | `src/pages/LandlordLogin.jsx` | No | No |
| `/LandlordDashboard` | `src/pages/LandlordDashboard.jsx` | Landlord code | Yes (`?propertyId`) |
| `/LandlordRequests` | `src/pages/LandlordRequests.jsx` | Landlord code | Yes (`?propertyId`) |
| `/Accounting` | `src/pages/Accounting.jsx` | Landlord code | Yes (`?propertyId`, `?tab`) |
| `*` | `src/lib/PageNotFound.jsx` | No | No |

### URL Parameter Conventions

Pages receive context via query parameters (not route params):
- `?propertyId=<uuid>` -- most tenant and landlord pages
- `?id=<uuid>` -- Profile page (business ID)
- `?businessId=<uuid>` -- MyCard page
- `?tab=<string>` -- Accounting page tab selection

Navigation helper: `createPageUrl(pageName)` from `src/utils/index.ts` converts page name to URL path (e.g., `createPageUrl('LandlordDashboard')` returns `'/LandlordDashboard'`).

### No Layout Component

The `pagesConfig` object has no `Layout` property. Each page independently composes:
- Fixed header with logo, navigation links, and notification bell
- `<BottomNav propertyId={propertyId} />` for mobile navigation (5 tabs: Home, Directory, Community, Requests, My Profile)
- Content area with page-specific styling
- Brand gradient backgrounds (`bg-gradient-to-br from-brand-navy via-brand-blue to-brand-navy`)

## Database Schema

### Tables (from `supabase/migrations/`)

| Table | Purpose | Key Columns | Key Relationships |
|-------|---------|-------------|-------------------|
| `properties` | Commercial properties | `name`, `address`, `city`, `state`, `total_units`, `landlord_code` | Root entity |
| `units` | Physical units within properties | `unit_number`, `street_address`, `status` (vacant/occupied/maintenance) | FK `property_id` -> properties |
| `businesses` | Tenant business profiles | `business_name`, `owner_email`, `unit_number`, `category` | FK `property_id`, `unit_id` |
| `posts` | Community posts | `type` (announcement/event/offer), `title`, `content` | FK `property_id`, `business_id` |
| `recommendations` | Requests/issues/work orders | `type`, `priority`, `status`, `category` | FK `property_id`, `business_id` |
| `notifications` | User notifications | `user_email`, `type`, `read`, `related_id` | FK `property_id` |
| `ads` | Property advertisements | `headline`, `active`, `business_type` | FK `property_id` |
| `leases` | Lease agreements | `monthly_rent`, `start_date`, `end_date`, `status` | FK `property_id`, `business_id`, `unit_id` |
| `recurring_payments` | Payment schedules | `amount`, `frequency`, `day_of_month`, `status` | FK `property_id`, `business_id`, `lease_id` |
| `invoices` | Billing invoices | `amount`, `due_date`, `status` | FK `property_id`, `business_id`, `lease_id` |
| `expenses` | Property expenses | `amount`, `category`, `vendor` | FK `property_id` |
| `payments` | Payment records | `amount`, `status`, `due_date`, `paid_date` | FK `property_id`, `business_id` |
| `activity_logs` | Page visit tracking | `user_id`, `page_name` | FK `auth.users(id)` |

### Entity Relationship Diagram

```
properties (root)
  |
  +-- units (physical spaces, unique per property_id + unit_number)
  |     |-- businesses.unit_id (tenant occupying a unit)
  |     +-- leases.unit_id
  |
  +-- businesses (tenant profiles, owned by owner_email)
  |     |-- posts.business_id
  |     |-- recommendations.business_id
  |     |-- leases.business_id
  |     |-- recurring_payments.business_id
  |     |-- invoices.business_id
  |     +-- payments.business_id
  |
  +-- posts (community content)
  +-- recommendations (requests/issues)
  +-- notifications (scoped by user_email, not user_id)
  +-- ads
  +-- leases
  |     |-- recurring_payments.lease_id
  |     +-- invoices.lease_id
  +-- recurring_payments
  +-- invoices
  +-- expenses
  +-- payments

activity_logs -> auth.users(id) (separate from property hierarchy)
```

### Database Triggers

**`trg_business_unit_status`** (defined in `supabase/migrations/002_units_table.sql`):
- Fires after INSERT, UPDATE of `unit_id`, or DELETE on `businesses`
- Automatically updates `units.status` to `'occupied'` when a business is assigned
- Automatically updates `units.status` to `'vacant'` when the last business is removed
- Handles edge case of multiple businesses per unit

### Indexes

All tables have indexes on `property_id` for efficient property-scoped queries. Additional indexes:
- `idx_businesses_owner_email` on `businesses(owner_email)` -- for user's business lookup
- `idx_businesses_unit` on `businesses(unit_id)` -- for unit occupancy queries
- `idx_recommendations_status` on `recommendations(status)` -- for filtering by status
- `idx_notifications_user_property` on `notifications(user_email, property_id)` -- compound for user notifications
- `idx_units_status` on `units(status)` -- for vacancy queries
- Unique constraint `uq_units_property_unit` on `units(property_id, unit_number)` -- prevents duplicate unit numbers

### Migration Files

| File | Purpose |
|------|---------|
| `supabase/migrations/001_initial_schema.sql` | All core tables (12), indexes, and RLS policies (345 lines) |
| `supabase/migrations/002_units_table.sql` | Units table, FK additions to businesses/leases, auto-status trigger (122 lines) |
| `supabase/migrations/002_seed_properties.sql` | Seed data for 7 Decker Capital properties |
| `supabase/migrations/003_seed_decker_properties.sql` | Additional seed data with unit addresses |

## Row-Level Security (RLS)

RLS is enabled on **all 13 tables**. Current policy approach:

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `properties` | All authenticated | -- | -- | -- |
| `businesses` | All authenticated | Owner only (`owner_email = jwt.email`) | Owner only | -- |
| `units` | All authenticated | All authenticated | All authenticated | All authenticated |
| `posts` | All authenticated | All authenticated | -- | -- |
| `recommendations` | All authenticated | All authenticated | All authenticated | -- |
| `notifications` | Own only (`user_email = jwt.email`) | All authenticated | Own only | -- |
| `ads` | All authenticated | -- | -- | -- |
| `leases` | All authenticated | All authenticated | All authenticated | All authenticated |
| `recurring_payments` | All authenticated | All authenticated | All authenticated | All authenticated |
| `invoices` | All authenticated | All authenticated | All authenticated | All authenticated |
| `expenses` | All authenticated | All authenticated | All authenticated | All authenticated |
| `payments` | All authenticated | All authenticated | -- | -- |
| `activity_logs` | Own only (`user_id = auth.uid()`) | Own only | -- | -- |

**Security gap:** Financial tables (leases, invoices, expenses, recurring_payments) have fully permissive RLS policies. The migration comments note: "tighten with landlord roles later."

## Service Layer Patterns

### Service Object Pattern

All services in `src/services/` follow this pattern:

```javascript
// src/services/{entity}.js
import { supabase } from './supabaseClient';

export const {entity}Service = {
  async filter(filters, orderBy = 'created_date', ascending = false) {
    let query = supabase.from('{table}').select('*');
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    query = query.order(orderBy, { ascending });
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('{table}').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async create(record) {
    const { data, error } = await supabase
      .from('{table}').insert(record).select().single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('{table}').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
};
```

### Accounting Service Factory

`src/services/accounting.js` uses a factory function to reduce boilerplate:

```javascript
function createAccountingService(tableName) {
  return { filter(), create(), update(), delete() };
}

export const leasesService = createAccountingService('leases');
export const recurringPaymentsService = createAccountingService('recurring_payments');
export const invoicesService = createAccountingService('invoices');
export const expensesService = createAccountingService('expenses');
export const paymentsService = createAccountingService('payments');
```

### Storage Service

`src/services/storage.js` wraps Supabase Storage for file uploads:
- Uploads to `public-assets` bucket under `uploads/` path
- Generates unique filenames with timestamp + random string
- Returns `{ file_url: publicUrl }` for direct CDN access

## Error Handling

### Strategy

- **Service layer:** All service methods throw on Supabase errors (`if (error) throw error`)
- **React Query:** Catches thrown errors; exposes `isError` and `error` states
- **Pages:** Most pages do not display error states; rely on React Query's `initialData: []` to show empty state
- **Auth errors:** Handled explicitly in `AuthContext.jsx` with typed error objects (`auth_required`, `user_not_registered`, `unknown`)
- **Navigation tracking:** Intentionally silent failures via `.catch(() => {})`
- **No error boundaries:** An unhandled error in any component crashes the entire app

### Toast Notifications

Two toast libraries are installed (consolidation needed):
- `react-hot-toast` via `src/components/ui/toaster.jsx` (rendered in `src/App.jsx`)
- `sonner` via `src/components/ui/sonner.jsx`

## Cross-Cutting Concerns

**Navigation Tracking:**
- `src/lib/NavigationTracker.jsx` logs page visits via `activityLogsService.logPageVisit()` for authenticated users
- Renders as invisible component in `src/App.jsx`

**Brand Theming:**
- Brand colors defined in `tailwind.config.js` under `brand.*` namespace: navy `#101B29`, blue `#1D263A`, slate `#465A75`, steel `#7C8DA7`, gray `#E0E1DE`
- Semantic color maps in `src/lib/colors.js` for status, priority, financial, category contexts
- CSS custom properties in `src/index.css` for shadcn/ui component theming
- Chart hex colors in `src/lib/colors.js` for Recharts

**Property Scoping:**
- Nearly all data is scoped to a property via `property_id`
- Property context flows through URL query parameters (`?propertyId=xxx`), not through React Context
- Every page independently parses `propertyId` from the URL via `new URLSearchParams(window.location.search)`

## Key Findings

- **No server-side business logic:** All mutation side effects (e.g., creating notifications when a post is created) happen client-side in `useMutation` callbacks in `src/pages/Community.jsx`. Notifications are only created when the originating client completes the request.
- **Landlord auth is client-side only:** The landlord code comparison in `src/pages/LandlordLogin.jsx` happens in the browser against fetched property data. Any authenticated user can access landlord endpoints via direct Supabase queries.
- **Duplicated current-user pattern:** At least 5 page components independently query `supabase.auth.getUser()` via React Query instead of using the `useAuth()` context, which already has the user.
- **No error boundaries:** There are no React error boundaries anywhere in the component tree.
- **Property context is URL-only:** There is no persistent property selection. Navigating to a page without `?propertyId` shows an empty state rather than remembering the last-used property.
- **Financial table RLS is wide open:** All authenticated users can read/write/delete any lease, invoice, expense, or recurring payment across all properties.
- **Base44 SDK still in package.json:** The `@base44/sdk` and `@base44/vite-plugin` packages are still listed as dependencies even though the migration to Supabase is complete. The old `src/api/base44Client.js` has been deleted.

---

*Architecture analysis: 2026-03-25*
