# Architecture

**Analysis Date:** 2026-03-27

## Pattern Overview

**Overall:** Page-driven Single Page Application (SPA) with thin service-layer abstraction over Supabase BaaS

**Key Characteristics:**
- Client-only architecture -- no custom backend server, all data flows through Supabase JS client
- Filesystem-based route auto-registration via `src/pages.config.js` (auto-generated, do not manually edit)
- React Query (TanStack Query) manages all server state, caching, and synchronization
- Thin service layer (`src/services/`) wraps Supabase client calls into domain-specific APIs
- React Context used sparingly: AuthContext for auth state, PropertyContext for landlord property scope
- Dual-role user model: tenants (public property visitors) and landlords (OTP magic-link authenticated property managers)
- Property-scoped data model -- nearly all queries filter by `property_id`
- Row-Level Security (RLS) in PostgreSQL enforces access control at the database layer
- Financial tables (leases, invoices, expenses, payments, recurring_payments) have property-scoped RLS restricted to landlords

**Key Design Decisions:**
- No SSR or server-side rendering -- pure client SPA deployed as static files
- No custom API layer -- Supabase JS client talks directly to PostgreSQL via PostgREST
- Tenant pages get `propertyId` from URL query parameters; landlord pages get it from PropertyContext (persisted in localStorage)
- Audit log table is append-only (no UPDATE or DELETE RLS policies)

## Layer Diagram

```
Browser
  |
  v
[React SPA]
  |
  +--> [Pages]  --useQuery/useMutation--> [Service Layer] --supabase.from()--> [Supabase (PostgreSQL + Auth + Storage)]
  |       |
  |       +--> [Feature Components] --> [UI Primitives (Radix/shadcn)]
  |
  +--> [AuthContext] --supabase.auth--> [Supabase Auth]
  |
  +--> [PropertyContext] --> localStorage (activePropertyId)
  |
  +--> [React Query Cache] (client-side server state)
```

## Layers

### Presentation Layer (Pages)

- **Purpose:** User-facing page-level composition. Each page is a self-contained route handler that fetches data, manages local UI state, and renders feature components.
- **Location:** `src/pages/` (13 page files)
- **Key files:**
  - `src/pages/Welcome.jsx` -- Landing page, property search, tenant onboarding entry
  - `src/pages/Register.jsx` -- Multi-step tenant business registration form
  - `src/pages/Community.jsx` -- Community posts feed (announcements, events, offers)
  - `src/pages/Directory.jsx` -- Business directory with grid/map views
  - `src/pages/Recommendations.jsx` -- Tenant request submission (enhancement, issue, work_order)
  - `src/pages/MyCard.jsx` -- Tenant digital business card editor
  - `src/pages/Profile.jsx` -- Tenant profile page
  - `src/pages/BrowseProperties.jsx` -- Property listing and discovery
  - `src/pages/LandlordLogin.jsx` -- OTP magic-link landlord authentication
  - `src/pages/LandlordDashboard.jsx` -- Landlord overview: occupancy, revenue, requests summary
  - `src/pages/LandlordRequests.jsx` -- Landlord request management with status updates
  - `src/pages/Accounting.jsx` -- Full accounting suite: leases, invoices, expenses, payments, reports
  - `src/pages/AuditPage.jsx` -- Audit log viewer with filters
- **Depends on:** Service layer, React Query hooks, AuthContext, PropertyContext, feature components, UI primitives
- **Used by:** React Router (via `src/pages.config.js` mapping and `src/App.jsx` route definitions)

### Feature Components Layer

- **Purpose:** Reusable domain-specific UI components and modal dialogs for create/edit operations
- **Location:** `src/components/` (21 component files + `accounting/` subdirectory + `guards/` subdirectory)
- **Key files:**
  - `src/components/PostCard.jsx` -- Community post display card
  - `src/components/BusinessCard.jsx` -- Business directory card
  - `src/components/CreatePostModal.jsx` -- Post creation dialog
  - `src/components/CreateRecommendationModal.jsx` -- Request submission dialog
  - `src/components/NotificationBell.jsx` -- Tenant notification dropdown
  - `src/components/LandlordNotificationBell.jsx` -- Landlord notification dropdown
  - `src/components/PropertySwitcher.jsx` -- Landlord multi-property dropdown switcher
  - `src/components/BottomNav.jsx` -- Tenant mobile bottom navigation bar (5 tabs)
  - `src/components/FloorMapView.jsx` -- Interactive floor plan with business pins
  - `src/components/BusinessQRCode.jsx` -- QR code generation for business profiles
  - `src/components/QRCodeCard.jsx` -- QR code display card
  - `src/components/AdBanner.jsx` -- Advertisement banner
  - `src/components/AdPopup.jsx` -- Advertisement popup modal
  - `src/components/PropertySearch.jsx` -- Property search/filter component
  - `src/components/UnitLogo.jsx` -- Brand logo component
  - `src/components/UserNotRegisteredError.jsx` -- Error state for unregistered users
  - `src/components/AuditLogEntry.jsx` -- Single audit log entry display
  - `src/components/AuditLogTimeline.jsx` -- Audit log timeline list
  - `src/components/accounting/LeaseModal.jsx` -- Lease create/edit dialog
  - `src/components/accounting/InvoiceModal.jsx` -- Invoice create/edit dialog
  - `src/components/accounting/ExpenseModal.jsx` -- Expense create/edit dialog
  - `src/components/accounting/RecurringPaymentModal.jsx` -- Recurring payment create/edit dialog
  - `src/components/accounting/FinancialReports.jsx` -- Charts and financial reporting (Recharts)
- **Depends on:** UI primitives, service layer (via props/callbacks), Lucide icons, Framer Motion
- **Used by:** Page components

### UI Primitives Layer

- **Purpose:** Reusable, accessible, unstyled building blocks with consistent Tailwind styling
- **Location:** `src/components/ui/` (49 files)
- **Source:** shadcn/ui (New York style) configured via `components.json`
- **Key files:** `button.jsx`, `card.jsx`, `dialog.jsx`, `input.jsx`, `select.jsx`, `tabs.jsx`, `table.jsx`, `badge.jsx`, `toast.jsx`, `toaster.jsx`, `dropdown-menu.jsx`, `alert-dialog.jsx`, `sheet.jsx`, `sidebar.jsx`
- **Pattern:** Each file exports a React component wrapping a Radix UI primitive with CVA (Class Variance Authority) variants and Tailwind CSS classes
- **Depends on:** Radix UI, CVA, clsx, tailwind-merge (via `cn()` from `src/lib/utils.js`)
- **Used by:** All feature components and pages
- **Note:** These are generated/scaffolded shadcn/ui components. Excluded from `jsconfig.json` type checking. Do not manually edit.

### Service Layer

- **Purpose:** Abstract Supabase database operations into domain-specific async APIs
- **Location:** `src/services/` (11 files)
- **Key files:**
  - `src/services/supabaseClient.js` -- Singleton Supabase client (reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`)
  - `src/services/businesses.js` -- CRUD for `businesses` table (filter, getById, create, update)
  - `src/services/properties.js` -- Read operations for `properties` table (list, getById, filter)
  - `src/services/posts.js` -- Read/create for `posts` table
  - `src/services/recommendations.js` -- CRUD for `recommendations` table (tenant requests)
  - `src/services/notifications.js` -- CRUD + markAllRead for `notifications` table
  - `src/services/accounting.js` -- Factory pattern: `createAccountingService(tableName)` generates CRUD for 5 tables: `leasesService`, `recurringPaymentsService`, `invoicesService`, `expensesService`, `paymentsService`
  - `src/services/units.js` -- Read operations for `units` table (listByProperty, getVacant, getById, updateStatus)
  - `src/services/storage.js` -- File upload to Supabase Storage bucket `public-assets`
  - `src/services/ads.js` -- Read-only for `ads` table
  - `src/services/activityLogs.js` -- Fire-and-forget page visit logging to `activity_logs` table
- **Pattern:** Each service exports an object literal with async methods. Methods construct Supabase queries, throw on errors, and return data.
- **Depends on:** `src/services/supabaseClient.js` only
- **Used by:** Page components via React Query `queryFn` and `mutationFn` callbacks

### State Management Layer

- **Purpose:** Manage client-side state: auth session, property context, server cache
- **Location:** `src/lib/`
- **Key files:**
  - `src/lib/AuthContext.jsx` -- React Context providing: `user`, `isAuthenticated`, `isLoadingAuth`, `isLandlord`, `userRole`, `propertyIds`, `logout()`, `navigateToLogin()`, `checkAppState()`
  - `src/lib/PropertyContext.jsx` -- React Context providing: `activePropertyId`, `switchProperty()`. Persists selection to localStorage. Invalidates all React Query caches on property switch.
  - `src/lib/query-client.js` -- QueryClient singleton with defaults: `refetchOnWindowFocus: false`, `retry: 1`
- **Depends on:** Supabase JS client, @tanstack/react-query
- **Used by:** App.jsx (providers), all page components (consumers)

### Cross-Cutting Layer

- **Purpose:** Shared utilities, routing config, brand constants, monitoring
- **Location:** `src/lib/`, `src/utils/`, `src/hooks/`
- **Key files:**
  - `src/lib/NavigationTracker.jsx` -- Renderless component that logs page visits via `activityLogsService.logPageVisit()` for authenticated users
  - `src/lib/AuditLogger.js` -- `writeAudit()` function for recording financial/request mutations to `audit_log` table. Called with `.catch(() => {})` to prevent audit failures from blocking mutations.
  - `src/lib/colors.js` -- Brand hex values (`BRAND`), semantic status colors (`STATUS_COLORS`, `PRIORITY_COLORS`), financial colors (`FINANCIAL_COLORS`), chart colors (`CHART_COLORS`), category colors (`CATEGORY_COLORS`, `CATEGORY_GRADIENTS`)
  - `src/lib/utils.js` -- `cn()` class merge utility (clsx + tailwind-merge), `isIframe` flag
  - `src/lib/PageNotFound.jsx` -- 404 page component
  - `src/utils/index.ts` -- `createPageUrl(pageName)` utility for generating route paths
  - `src/hooks/use-mobile.jsx` -- `useIsMobile()` responsive breakpoint hook (768px)
  - `src/pages.config.js` -- AUTO-GENERATED route-to-page mapping. Do not manually edit.

### Route Protection Layer

- **Purpose:** Guard landlord routes from unauthorized access
- **Location:** `src/components/guards/`
- **Key files:**
  - `src/components/guards/LandlordGuard.jsx` -- React Router layout route (`<Outlet />`) that checks `isLandlord` from AuthContext. Redirects to `/LandlordLogin` if no user, `/Welcome` if not a landlord.
- **Depends on:** AuthContext, React Router
- **Used by:** `src/App.jsx` wraps landlord routes in `<LandlordGuard />`

### Database Layer (Supabase)

- **Purpose:** PostgreSQL database with Row-Level Security, Auth, and Storage
- **Location:** `supabase/migrations/` (6 migration files)
- **Key migrations:**
  - `001_initial_schema.sql` -- Core tables: properties, businesses, posts, recommendations, notifications, ads, leases, recurring_payments, invoices, expenses, payments, activity_logs. Initial RLS policies.
  - `002_units_table.sql` -- Units table with auto-status trigger (vacant/occupied based on business assignments)
  - `002_seed_properties.sql` -- Seed data for properties
  - `003_landlord_auth.sql` -- Profiles table, `is_landlord()` and `landlord_property_ids()` helper functions, property-scoped financial RLS, audit_log table (append-only), landlord_code neutralization trigger
  - `003_seed_decker_properties.sql` -- Seed data for Decker Capital properties
  - `004_auto_profile_creation.sql` -- Trigger to auto-create tenant profile on auth.users insert, backfills existing users
- **Tables (15 total):** properties, businesses, units, posts, recommendations, notifications, ads, leases, recurring_payments, invoices, expenses, payments, activity_logs, audit_log, profiles
- **Database functions:**
  - `is_landlord()` -- Returns boolean: whether current user has landlord role in profiles
  - `landlord_property_ids()` -- Returns UUID array of properties the landlord manages
  - `update_unit_status()` -- Trigger: auto-updates unit status on business insert/update/delete
  - `prevent_landlord_code_write()` -- Trigger: nullifies landlord_code field on properties table
  - `handle_new_user()` -- Trigger: auto-creates tenant profile on user signup

## Data Flow

### Tenant Data Flow (URL Query Parameter Pattern)

1. User navigates to a tenant page (e.g., `/Community?propertyId=xxx`)
2. Page component reads `propertyId` from `new URLSearchParams(window.location.search)`
3. Page calls service methods via `useQuery({ queryFn: () => service.filter({ property_id: propertyId }) })`
4. Service method builds Supabase query and returns data
5. React Query caches response under `queryKey` (e.g., `['posts', propertyId]`)
6. On mutation success, `queryClient.invalidateQueries()` triggers re-fetch

### Landlord Data Flow (PropertyContext Pattern)

1. Landlord authenticates via OTP magic link on `/LandlordLogin`
2. `AuthContext` detects session, fetches profile from `profiles` table, exposes `propertyIds` and `isLandlord`
3. `LandlordGuard` verifies landlord role, renders `<Outlet />`
4. `PropertyProvider` wraps landlord pages, provides `activePropertyId` from localStorage
5. Landlord pages call `const { activePropertyId: propertyId } = useProperty()`
6. All queries scope to `propertyId` from context (not URL)
7. `PropertySwitcher` component (visible when landlord manages multiple properties) calls `switchProperty()` which updates localStorage and invalidates ALL React Query caches

### Mutation Flow

1. User submits form in a modal component (e.g., `InvoiceModal`)
2. `useMutation({ mutationFn: (data) => service.create(data) })` fires
3. `onSuccess` callback: `queryClient.invalidateQueries({ queryKey: [...] })`
4. Optionally: `writeAudit({...}).catch(() => {})` logs the mutation to audit_log
5. Toast notification (two systems coexist: `react-hot-toast` and `sonner`)

### State Management Summary

| State Type | Mechanism | Location |
|---|---|---|
| Auth session | React Context (AuthProvider) | `src/lib/AuthContext.jsx` |
| Active property (landlord) | React Context + localStorage | `src/lib/PropertyContext.jsx` |
| Server data cache | React Query (TanStack Query) | `src/lib/query-client.js` |
| Active property (tenant) | URL query parameter `?propertyId=` | Each tenant page component |
| Form state | React useState | Modal/form components |
| UI state (tabs, modals, filters) | React useState | Page/feature components |

### Cache Invalidation Strategy

- **On mutation success:** `queryClient.invalidateQueries({ queryKey: ['tableName'] })` or `queryClient.invalidateQueries({ queryKey: ['tableName', propertyId] })`
- **On property switch:** `queryClient.invalidateQueries()` (invalidates ALL queries)
- **Query defaults:** `refetchOnWindowFocus: false`, `retry: 1`
- **No optimistic updates** -- all mutations wait for server confirmation

### React Query Key Patterns

```
['properties']                    -- all properties list
['property', propertyId]          -- single property
['businesses', propertyId]        -- businesses for a property
['posts', propertyId]             -- posts for a property
['recommendations', propertyId]   -- recommendations for a property
['leases', propertyId]            -- leases for a property
['payments', propertyId]          -- payments for a property
['units', propertyId]             -- units for a property
['currentUser']                   -- authenticated user from Supabase session
['audit_log', entityType, id]     -- audit entries for a specific entity
['landlord-properties', ids]      -- properties for PropertySwitcher
```

## Authentication Architecture

### Dual Auth Model

The application has two distinct authentication paths:

**1. Tenant Authentication**
- Provider: Supabase Auth (session auto-persisted in localStorage by Supabase JS client)
- Implementation: `src/lib/AuthContext.jsx` wraps `supabase.auth.onAuthStateChange()`
- User object: Supabase `auth.users` record with `.email` used as business ownership key
- Profile: Auto-created via database trigger (`004_auto_profile_creation.sql`) with `role: 'tenant'`

**2. Landlord Authentication**
- Provider: Supabase Auth OTP (magic link) via `supabase.auth.signInWithOtp({ email })`
- Implementation: `src/pages/LandlordLogin.jsx`
- Redirect: Magic link redirects to `window.location.origin + '/LandlordDashboard'`
- Profile: Must have `role: 'landlord'` and `property_ids` array in `profiles` table (set manually or via seed data)
- Guard: `src/components/guards/LandlordGuard.jsx` checks `isLandlord` from AuthContext

### Auth State Flow

```
App mounts
  -> AuthProvider calls supabase.auth.getSession()
  -> onAuthStateChange listener registered
  -> If session exists: sets user + isAuthenticated = true, fetches profile for role/propertyIds
  -> If no session and no auth callback tokens in URL: isLoadingAuth = false
  -> If URL has auth tokens (magic link callback): waits for onAuthStateChange to fire SIGNED_IN
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
  isLoadingPublicSettings, // boolean (resolves immediately -- no remote call)
  authError,               // { type: 'auth_required'|'user_not_registered'|'unknown', message } or null
  appPublicSettings,       // static { id: 'unit-app', public_settings: {} }
  isLandlord,              // boolean (derived from userRole === 'landlord')
  userRole,                // 'tenant' | 'landlord' | null
  propertyIds,             // UUID[] (from profiles table)
  logout,                  // async (shouldRedirect = true) => void
  navigateToLogin,         // () => void (redirects to /LandlordLogin)
  checkAppState            // async () => void (re-check session)
}
```

### Duplicated Current-User Pattern

Multiple tenant pages query Supabase auth directly instead of using `useAuth()`:
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
This is redundant since `useAuth()` already provides the `user` object.

## Routing Architecture

### Auto-Registration System

- `src/pages.config.js` is auto-generated from files in `src/pages/`
- Each `.jsx` file in `src/pages/` becomes a route at `/<FileName>`
- Main page configured as `"Welcome"` (renders at `/`)
- **Do not manually edit** `src/pages.config.js` except for `mainPage` value

### Route Map

| Route | Page Component | Protection | Property Source |
|---|---|---|---|
| `/` | `src/pages/Welcome.jsx` | None (auth checked) | N/A |
| `/Welcome` | `src/pages/Welcome.jsx` | None | N/A |
| `/Register` | `src/pages/Register.jsx` | None | URL `?propertyId=` |
| `/BrowseProperties` | `src/pages/BrowseProperties.jsx` | None | N/A |
| `/Community` | `src/pages/Community.jsx` | None | URL `?propertyId=` |
| `/Directory` | `src/pages/Directory.jsx` | None | URL `?propertyId=` |
| `/Recommendations` | `src/pages/Recommendations.jsx` | None | URL `?propertyId=` |
| `/MyCard` | `src/pages/MyCard.jsx` | None | URL `?propertyId=` |
| `/Profile` | `src/pages/Profile.jsx` | None | URL `?id=` |
| `/LandlordLogin` | `src/pages/LandlordLogin.jsx` | None | N/A |
| `/LandlordDashboard` | `src/pages/LandlordDashboard.jsx` | LandlordGuard | PropertyContext |
| `/LandlordRequests` | `src/pages/LandlordRequests.jsx` | LandlordGuard | PropertyContext |
| `/Accounting` | `src/pages/Accounting.jsx` | LandlordGuard | PropertyContext |
| `/AuditPage` | `src/pages/AuditPage.jsx` | LandlordGuard | PropertyContext |
| `*` | `src/lib/PageNotFound.jsx` | None | N/A |

### URL Parameter Conventions

Pages receive context via query parameters (not route params):
- `?propertyId=<uuid>` -- most tenant pages
- `?id=<uuid>` -- Profile page (business ID)
- `?businessId=<uuid>` -- MyCard page
- `?tab=<string>` -- Accounting page tab selection

Navigation helper: `createPageUrl(pageName)` from `src/utils/index.ts` converts page name to URL path.

### Provider Nesting Order (outermost to innermost)

```
<AuthProvider>
  <QueryClientProvider>
    <BrowserRouter>
      <NavigationTracker />
      <AuthenticatedApp>
        <Routes>
          <!-- Tenant pages: LayoutWrapper > Page -->
          <!-- Landlord pages: LandlordGuard > PropertyProvider > LayoutWrapper > Page -->
        </Routes>
      </AuthenticatedApp>
    </BrowserRouter>
    <Toaster />
  </QueryClientProvider>
</AuthProvider>
```

### No Layout Component

The `pagesConfig` object has no `Layout` property. Each page independently composes:
- Fixed header with logo, navigation links, and notification bell
- `<BottomNav propertyId={propertyId} />` for mobile navigation (5 tabs: Home, Directory, Community, Requests, My Profile)
- Content area with page-specific styling
- Brand gradient backgrounds (`bg-gradient-to-br from-brand-navy via-brand-blue to-brand-navy`)

## Database Schema

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
  +-- notifications (scoped by user_email)
  +-- ads
  +-- leases
  |     |-- recurring_payments.lease_id
  |     +-- invoices.lease_id
  +-- recurring_payments
  +-- invoices
  +-- expenses
  +-- payments

profiles -> auth.users(id) (role + property_ids)
audit_log (append-only, landlord-only read/write)
activity_logs -> auth.users(id) (page visit tracking)
```

### Tables (15 total)

| Table | Purpose | Key Columns | FK Relationships |
|---|---|---|---|
| `properties` | Commercial properties | `name`, `address`, `city`, `state`, `total_units`, `image_url` | Root entity |
| `units` | Physical units within properties | `unit_number`, `street_address`, `status` | FK `property_id` |
| `businesses` | Tenant business profiles | `business_name`, `owner_email`, `category` | FK `property_id`, `unit_id` |
| `posts` | Community posts | `type`, `title`, `content`, `event_date` | FK `property_id`, `business_id` |
| `recommendations` | Requests/issues/work orders | `type`, `priority`, `status`, `category` | FK `property_id`, `business_id` |
| `notifications` | User notifications | `user_email`, `type`, `read`, `related_id` | FK `property_id` |
| `ads` | Property advertisements | `headline`, `active`, `business_type` | FK `property_id` |
| `leases` | Lease agreements | `monthly_rent`, `start_date`, `end_date`, `status` | FK `property_id`, `business_id`, `unit_id` |
| `recurring_payments` | Payment schedules | `amount`, `frequency`, `day_of_month`, `status` | FK `property_id`, `business_id`, `lease_id` |
| `invoices` | Billing invoices | `amount`, `due_date`, `status`, `invoice_number` | FK `property_id`, `business_id`, `lease_id` |
| `expenses` | Property expenses | `amount`, `category`, `vendor`, `expense_date` | FK `property_id` |
| `payments` | Payment records | `amount`, `status`, `due_date`, `paid_date` | FK `property_id`, `business_id` |
| `profiles` | User roles and property assignments | `role`, `property_ids`, `email` | FK `auth.users(id)` |
| `audit_log` | Append-only mutation log | `entity_type`, `action`, `old_value`, `new_value` | FK `auth.users(id)` |
| `activity_logs` | Page visit tracking | `user_id`, `page_name` | FK `auth.users(id)` |

### Row-Level Security

RLS is enabled on **all 15 tables**. Current policy approach:

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `properties` | All authenticated | -- | -- | -- |
| `businesses` | All authenticated | Owner only (`owner_email`) | Owner only | -- |
| `units` | All authenticated | All authenticated | All authenticated | All authenticated |
| `posts` | All authenticated | All authenticated | -- | -- |
| `recommendations` | All authenticated | All authenticated | All authenticated | -- |
| `notifications` | Own only (`user_email`) | All authenticated | Own only | -- |
| `ads` | All authenticated | -- | -- | -- |
| `leases` | Landlord + property match | Landlord + property match | Landlord + property match | Landlord + property match |
| `recurring_payments` | Landlord + property match | Landlord + property match | Landlord + property match | Landlord + property match |
| `invoices` | Landlord + property match | Landlord + property match | Landlord + property match | Landlord + property match |
| `expenses` | Landlord + property match | Landlord + property match | Landlord + property match | Landlord + property match |
| `payments` | Landlord + property match | Landlord + property match | Landlord + property match | Landlord + property match |
| `profiles` | Own only (`auth.uid()`) | Service role only | Service role only | Service role only |
| `audit_log` | Landlord only | Landlord only | **None (append-only)** | **None (append-only)** |
| `activity_logs` | Own only (`auth.uid()`) | Own only | -- | -- |

Financial table RLS uses `is_landlord() AND property_id = ANY(landlord_property_ids())` for property-scoped access control.

### Database Triggers

- **`trg_business_unit_status`** (`002_units_table.sql`): After INSERT/UPDATE/DELETE on businesses, auto-updates `units.status` to occupied/vacant
- **`no_landlord_code`** (`003_landlord_auth.sql`): Before INSERT/UPDATE on properties, nullifies `landlord_code` field
- **`on_auth_user_created`** (`004_auto_profile_creation.sql`): After INSERT on auth.users, creates tenant profile

### Indexes

All tables have indexes on `property_id`. Additional indexes:
- `idx_businesses_owner_email` on `businesses(owner_email)`
- `idx_businesses_unit` on `businesses(unit_id)`
- `idx_recommendations_status` on `recommendations(status)`
- `idx_notifications_user_property` on `notifications(user_email, property_id)` (compound)
- `idx_units_status` on `units(status)`
- Unique constraint `uq_units_property_unit` on `units(property_id, unit_number)`

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

  async getById(id) { /* ... */ },
  async create(record) { /* ... */ },
  async update(id, updates) { /* ... */ }
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

## Error Handling Strategy

### Service Layer

- All service methods throw on Supabase errors (`if (error) throw error`)
- React Query catches thrown errors; exposes `isError` and `error` on query/mutation results

### Auth Errors

- `src/lib/AuthContext.jsx` types errors as `{ type: 'auth_required' | 'user_not_registered' | 'unknown', message: string }`
- `AuthenticatedApp` in `src/App.jsx` handles typed errors with appropriate UI

### Audit Logger Errors

- `writeAudit()` in `src/lib/AuditLogger.js` is called with `.catch(() => {})` to prevent audit failures from blocking the primary mutation
- Activity logging in `src/lib/NavigationTracker.jsx` also uses fire-and-forget `.catch(() => {})`

### Missing Error Handling (Gaps)

- No React Error Boundaries anywhere in the component tree
- No `onError` callbacks on most `useMutation` calls
- No user-facing error messages for failed data fetches
- Two toast systems coexist: `react-hot-toast` and `sonner`

## Cross-Cutting Concerns

### Navigation Tracking
- `src/lib/NavigationTracker.jsx` -- renderless component in `App.jsx` that logs page visits for authenticated users via `activityLogsService.logPageVisit()`

### Audit Logging
- `src/lib/AuditLogger.js` -- `writeAudit()` inserts into append-only `audit_log` table
- Used by landlord pages (Accounting, LandlordRequests) in mutation `onSuccess` callbacks

### Brand Theming
- CSS custom properties: `src/index.css` (light/dark mode)
- Tailwind brand colors: `brand-navy`, `brand-blue`, `brand-slate`, `brand-steel`, `brand-gray` in `tailwind.config.js`
- Semantic color maps: `src/lib/colors.js` (STATUS_COLORS, PRIORITY_COLORS, FINANCIAL_COLORS, CHART_COLORS, CATEGORY_COLORS)
- Icon library: Lucide React

### Property Scoping
- Nearly all data scoped by `property_id`
- Tenant pages: URL query parameter `?propertyId=xxx`
- Landlord pages: `PropertyContext` with localStorage persistence

### Route Protection
- Client-side: `LandlordGuard` checks `isLandlord` from AuthContext
- Database-side: RLS policies on financial/audit tables require `is_landlord()` and matching `property_id`

---

*Architecture analysis: 2026-03-27*
