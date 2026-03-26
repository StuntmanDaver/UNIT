# External Integrations

> Generated: 2026-03-25 | Focus: tech

## Overview

UNIT integrates exclusively with Supabase for all backend needs: PostgreSQL database, authentication, and file storage. The migration from Base44 BaaS is complete -- zero Base44 references remain in source code. A service layer in `src/services/` encapsulates all Supabase communication. Stripe packages are installed but not yet integrated.

## Supabase (Primary Backend)

**Client Setup:**
- Package: `@supabase/supabase-js` 2.100.0
- Client: `src/services/supabaseClient.js`
- Auth: Supabase anonymous key (public, RLS-enforced)
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Template: `.env.example`

**Initialization Pattern:**
```javascript
// src/services/supabaseClient.js
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## Database (Supabase PostgreSQL)

**Schema Location:** `supabase/migrations/`

**Migration Files:**
- `supabase/migrations/001_initial_schema.sql` - All core tables, indexes, RLS policies
- `supabase/migrations/002_units_table.sql` - Units table, FK additions to businesses/leases, auto-status trigger
- `supabase/migrations/002_seed_properties.sql` - Seed data for 7 Decker Capital properties
- `supabase/migrations/003_seed_decker_properties.sql` - Extended seed data (large file)

**Tables (12 total):**

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `properties` | Commercial property listings | PK only |
| `units` | Individual units within properties | `(property_id, unit_number)` unique, `status` |
| `businesses` | Tenant business profiles | `property_id`, `owner_email`, `unit_id` |
| `posts` | Community announcements/events/offers | `property_id` |
| `recommendations` | Enhancement requests / work orders | `property_id`, `status` |
| `notifications` | User notification inbox | `(user_email, property_id)` |
| `ads` | Property advertising/promotions | `property_id` |
| `leases` | Lease agreements | `property_id`, `unit_id` |
| `recurring_payments` | Scheduled payment definitions | `property_id` |
| `invoices` | Invoice records | `property_id` |
| `expenses` | Property expense tracking | `property_id` |
| `payments` | Payment records | `property_id` |
| `activity_logs` | Page visit tracking | PK only |

**Primary Key Pattern:** UUID via `uuid_generate_v4()`

**Foreign Key Relationships:**
- `businesses.property_id` -> `properties.id` (cascade delete)
- `businesses.unit_id` -> `units.id` (set null on delete)
- `units.property_id` -> `properties.id` (cascade delete)
- `posts.property_id` -> `properties.id` (cascade delete)
- `posts.business_id` -> `businesses.id` (set null)
- `recommendations.property_id` -> `properties.id` (cascade delete)
- `recommendations.business_id` -> `businesses.id` (set null)
- `notifications.property_id` -> `properties.id` (cascade delete)
- `leases.property_id` -> `properties.id` (cascade delete)
- `leases.business_id` -> `businesses.id` (set null)
- `leases.unit_id` -> `units.id` (set null)
- `recurring_payments.property_id` -> `properties.id` (cascade delete)
- `recurring_payments.lease_id` -> `leases.id` (set null)
- `invoices.property_id` -> `properties.id` (cascade delete)
- `invoices.lease_id` -> `leases.id` (set null)
- `expenses.property_id` -> `properties.id` (cascade delete)
- `payments.property_id` -> `properties.id` (cascade delete)
- `payments.business_id` -> `businesses.id` (set null)
- `activity_logs.user_id` -> `auth.users.id` (set null)

**Database Trigger:**
- `trg_business_unit_status` on `businesses` table (after insert/update/delete)
- Function: `update_unit_status()` auto-sets unit status to 'occupied' or 'vacant'
- Defined in `supabase/migrations/002_units_table.sql`

**Row-Level Security (RLS):**
- Enabled on all 12 tables
- Most tables: all authenticated users can SELECT
- `businesses`: INSERT/UPDATE restricted to `owner_email = auth.jwt()->>'email'`
- `notifications`: SELECT/UPDATE restricted to `user_email = auth.jwt()->>'email'`
- `activity_logs`: INSERT/SELECT restricted to `user_id = auth.uid()`
- Financial tables (leases, invoices, expenses, payments, recurring_payments): currently open to all authenticated users with a TODO to tighten with role-based checks

## Service Layer Architecture

**Location:** `src/services/`

**Pattern:** Each service file exports a named object with async methods that wrap Supabase queries. All services import `supabase` from `./supabaseClient`.

**Service Files:**

| Service | File | Table(s) | Methods |
|---------|------|----------|---------|
| `propertiesService` | `src/services/properties.js` | `properties` | `list()`, `getById(id)`, `filter(filters)` |
| `unitsService` | `src/services/units.js` | `units` | `listByProperty(propertyId)`, `getVacant(propertyId)`, `getById(id)`, `updateStatus(id, status)` |
| `businessesService` | `src/services/businesses.js` | `businesses` | `filter(filters)`, `getById(id)`, `create(data)`, `update(id, data)` |
| `postsService` | `src/services/posts.js` | `posts` | `filter(filters, orderBy, ascending)`, `create(data)` |
| `recommendationsService` | `src/services/recommendations.js` | `recommendations` | `filter(filters, orderBy, ascending)`, `create(data)`, `update(id, data)` |
| `notificationsService` | `src/services/notifications.js` | `notifications` | `filter(filters, orderBy, ascending, limit)`, `create(data)`, `update(id, data)`, `markAllRead(userEmail, propertyId)` |
| `adsService` | `src/services/ads.js` | `ads` | `filter(filters)` |
| `storageService` | `src/services/storage.js` | Supabase Storage | `uploadFile(file)` |
| `activityLogsService` | `src/services/activityLogs.js` | `activity_logs` | `logPageVisit(pageName)` |
| Accounting (5 services) | `src/services/accounting.js` | `leases`, `recurring_payments`, `invoices`, `expenses`, `payments` | `filter()`, `create()`, `update()`, `delete()` (via factory) |

**Accounting Factory Pattern:**
```javascript
// src/services/accounting.js - Generic CRUD factory
function createAccountingService(tableName) {
  return {
    async filter(filters, orderBy, ascending) { ... },
    async create(record) { ... },
    async update(id, updates) { ... },
    async delete(id) { ... }
  };
}
export const leasesService = createAccountingService('leases');
export const recurringPaymentsService = createAccountingService('recurring_payments');
export const invoicesService = createAccountingService('invoices');
export const expensesService = createAccountingService('expenses');
export const paymentsService = createAccountingService('payments');
```

**Common Service Method Pattern:**
```javascript
// Standard filter method used across all services
async filter(filters, orderBy = 'created_date', ascending = false) {
  let query = supabase.from('table_name').select('*');
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  query = query.order(orderBy, { ascending });
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
```

**Error Handling in Services:**
- All methods throw errors on Supabase query failure (`if (error) throw error`)
- Exception: `activityLogsService.logPageVisit()` silently catches all errors (fire-and-forget)

## Authentication & Identity

**Provider:** Supabase Auth

**Implementation:** `src/lib/AuthContext.jsx`

**Auth Flow:**
1. App loads, `AuthProvider` calls `checkAppState()`
2. Checks for existing Supabase session via `supabase.auth.getSession()`
3. Subscribes to auth state changes via `supabase.auth.onAuthStateChange()`
4. Sets `user`, `isAuthenticated`, `isLoadingAuth` state accordingly
5. On auth errors: sets `authError` with type (`unknown`, `auth_required`, `user_not_registered`)

**Auth State (exported via `useAuth()` hook):**
- `user` - Supabase user object (null if not authenticated)
- `isAuthenticated` - Boolean
- `isLoadingAuth` - Boolean (true during session check)
- `isLoadingPublicSettings` - Boolean (legacy, resolves immediately)
- `authError` - `{ type, message }` or null
- `appPublicSettings` - Stub object (legacy, hardcoded)
- `logout()` - Signs out via `supabase.auth.signOut()`, redirects to `/`
- `navigateToLogin()` - Redirects to `/LandlordLogin`
- `checkAppState()` - Re-checks session state

**Direct Supabase Auth Usage in Pages:**
Several page components call `supabase.auth.getSession()` and `supabase.auth.getUser()` directly (bypassing the AuthContext) to get the current user's email for data queries:
- `src/pages/Community.jsx`
- `src/pages/Register.jsx`
- `src/pages/MyCard.jsx`
- `src/pages/Recommendations.jsx`
- `src/lib/PageNotFound.jsx`
- `src/components/NotificationBell.jsx`

**Login Page:** `src/pages/LandlordLogin.jsx` (Supabase auth flow, likely email/password or magic link)

## File Storage

**Provider:** Supabase Storage

**Implementation:** `src/services/storage.js`

**Bucket:** `public-assets`

**Upload Pattern:**
```javascript
// Files uploaded to: public-assets/uploads/{timestamp}-{random}.{ext}
async uploadFile(file) {
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `uploads/${fileName}`;
  await supabase.storage.from('public-assets').upload(filePath, file);
  const { data: { publicUrl } } = supabase.storage.from('public-assets').getPublicUrl(filePath);
  return { file_url: publicUrl };
}
```

**Usage:** Business logos, post images, ad images (any file upload in the app)

**Public Access:** URLs are public (via `getPublicUrl`); no signed URL pattern

## Data Fetching & Caching

**Framework:** TanStack React Query 5.84.1

**Client Config (`src/lib/query-client.js`):**
```javascript
export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

**Pattern:** Pages use `useQuery` with service layer calls as `queryFn`. Mutations use `useMutation` with `queryClient.invalidateQueries()` for cache updates.

**Provider:** `QueryClientProvider` wraps the entire app in `src/App.jsx`

## Navigation Tracking

**Implementation:** `src/lib/NavigationTracker.jsx`

**Behavior:**
- Renders as a null component in `src/App.jsx`
- Monitors `location` changes via React Router
- When authenticated, logs page visits via `activityLogsService.logPageVisit(pageName)`
- Maps URL paths to page names using `pagesConfig.Pages` keys
- Silently fails on logging errors (fire-and-forget)

## Payments (Planned, Not Implemented)

**Packages Installed:**
- `@stripe/react-stripe-js` 3.0.0
- `@stripe/stripe-js` 5.2.0

**Status:** No Stripe imports exist in `src/`. These packages are installed but no integration code has been written. Likely a planned feature for tenant payment processing.

## Third-Party Libraries with External Dependencies

**QR Code Generation:**
- Package: `qrcode` 1.5.4
- Used in: `src/components/QRCodeCard.jsx`, `src/components/BusinessQRCode.jsx`
- External dependency: None (generates QR codes locally in canvas/SVG)

**Charts:**
- Package: `recharts` 2.15.4
- Used in: `src/pages/Accounting.jsx`, `src/components/accounting/FinancialReports.jsx`, `src/pages/LandlordDashboard.jsx`, `src/lib/colors.js`
- External dependency: None (renders SVG charts)

**Animations:**
- Package: `framer-motion` 11.16.4
- Used in: 21+ component and page files
- External dependency: None

## Monitoring & Observability

**Error Tracking:** None configured (no Sentry, Bugsnag, or similar)

**Logging:**
- Console only (`console.error`, `console.log`)
- Activity logging to `activity_logs` table via `activityLogsService` (page visits only)
- No structured logging, no log levels, no external logging service

## CI/CD & Deployment

**Hosting:** Not detected in repository configuration

**CI Pipeline:** Not detected (no `.github/workflows/`, no `Dockerfile`, no deployment config)

**Build:** `npm run build` produces static files in `dist/`

## Environment Configuration

**Required env vars:**
- `VITE_SUPABASE_URL` - Supabase project URL (e.g., `https://your-project.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous/public API key

**Env file locations:**
- `.env.example` - Template with placeholder values (committed)
- `.env.local` - Actual values (gitignored, contains secrets)

**Supabase Infrastructure Requirements:**
- PostgreSQL database with schema from `supabase/migrations/`
- Auth enabled (email/password or magic link)
- Storage bucket named `public-assets` with public access
- RLS policies applied per migration scripts

## Remaining Base44 References

**Source code (`src/`):** NONE -- zero references to Base44, `@base44/sdk`, or `base44Client`

**Deleted files (visible in git status):**
- `src/api/base44Client.js` - Deleted (was the Base44 SDK client)
- `src/lib/app-params.js` - Deleted (was Base44 URL parameter handling)

**CLAUDE.md:** Contains historical references to Base44 in documentation sections that should be updated

## Key Findings

- **Migration is complete** -- all backend calls route through `src/services/` to Supabase; no Base44 code remains
- **RLS policies are permissive** -- financial tables (leases, invoices, expenses, payments) allow all authenticated users full CRUD access; needs role-based tightening
- **Scattered auth calls** -- 6 files call `supabase.auth.getSession()`/`getUser()` directly instead of using the `useAuth()` hook; consider centralizing user email access in AuthContext
- **No server-side logic** -- all business logic runs in the browser; no Supabase Edge Functions or server-side validation
- **Storage is fully public** -- uploaded files use `getPublicUrl` with no access control
- **Stripe integration is staged** -- packages installed but no code written; will need Supabase Edge Functions for server-side payment processing

---

*Integration audit: 2026-03-25*
