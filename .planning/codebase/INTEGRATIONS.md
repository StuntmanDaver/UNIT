# External Integrations

**Analysis Date:** 2026-03-27

## APIs & External Services

**Supabase (sole external service):**
- Supabase JS SDK 2.100.0 - Database, Auth, and Storage
  - SDK/Client: `@supabase/supabase-js`
  - Singleton: `src/services/supabaseClient.js`
  - Auth: Supabase anonymous key (public, RLS-enforced)
  - Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**Stripe (installed, not integrated):**
- `@stripe/react-stripe-js` 3.0.0 and `@stripe/stripe-js` 5.2.0 are in `package.json`
- Zero imports exist anywhere in `src/` -- no integration code written
- Likely a planned feature for tenant payment processing

## Data Storage

**Database: Supabase PostgreSQL**

Connection via `src/services/supabaseClient.js`:
```javascript
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Schema Location:** `supabase/migrations/`

**Migration Files:**
- `supabase/migrations/001_initial_schema.sql` - Core tables (properties, businesses, posts, recommendations, notifications, ads, leases, recurring_payments, invoices, expenses, payments, activity_logs), indexes, RLS policies
- `supabase/migrations/002_units_table.sql` - Units table, FK additions to businesses/leases, auto-status trigger
- `supabase/migrations/002_seed_properties.sql` - Seed data for properties
- `supabase/migrations/003_landlord_auth.sql` - Profiles table, `is_landlord()`/`landlord_property_ids()` helper functions, property-scoped financial RLS, landlord_code neutralization, audit_log table
- `supabase/migrations/003_seed_decker_properties.sql` - Extended seed data
- `supabase/migrations/004_auto_profile_creation.sql` - Auto-create profile on signup trigger, backfill existing users

**Utility Scripts:**
- `scripts/seed-landlord.sql` - Manual SQL to promote a user to landlord role (run in Supabase SQL Editor)

**Tables (14 total):**

| Table | Purpose | Key Columns | Key Indexes |
|-------|---------|-------------|-------------|
| `properties` | Commercial property listings | id, name, address, city, state, type, total_units, image_url, landlord_code | PK only |
| `units` | Individual units within properties | id, property_id, unit_number, street_address, city, state, zip, building, status | `(property_id, unit_number)` unique, `status` |
| `businesses` | Tenant business profiles | id, property_id, unit_id, owner_email, business_name, category | `property_id`, `owner_email`, `unit_id` |
| `posts` | Community announcements/events/offers | id, property_id, business_id, type, title, content | `property_id` |
| `recommendations` | Enhancement requests / work orders | id, property_id, business_id, type, title, priority, status | `property_id`, `status` |
| `notifications` | User notification inbox | id, user_email, property_id, type, title, message, read | `(user_email, property_id)` |
| `ads` | Property advertising/promotions | id, property_id, active, headline, description, image_url | `property_id` |
| `leases` | Lease agreements | id, property_id, business_id, unit_id, start_date, end_date, monthly_rent, status | `property_id`, `unit_id` |
| `recurring_payments` | Scheduled payment definitions | id, property_id, business_id, lease_id, name, amount, frequency, status | `property_id` |
| `invoices` | Invoice records | id, property_id, business_id, lease_id, invoice_number, amount, status | `property_id` |
| `expenses` | Property expense tracking | id, property_id, category, amount, expense_date, vendor | `property_id` |
| `payments` | Payment records | id, property_id, business_id, amount, status, due_date, paid_date | `property_id` |
| `activity_logs` | Page visit tracking | id, user_id, page_name | PK only |
| `profiles` | User role and property assignments | id (FK to auth.users), role, property_ids, email | PK only |
| `audit_log` | Append-only financial/request mutation log | id, entity_type, entity_id, action, old_value (jsonb), new_value (jsonb), performed_by_user_id, performed_by_email | PK only |

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
- `profiles.id` -> `auth.users.id` (cascade delete)
- `audit_log.performed_by_user_id` -> `auth.users.id` (set null)

**Database Functions:**
- `is_landlord()` - Returns boolean; checks if current auth user has landlord role in profiles table (defined in `003_landlord_auth.sql`)
- `landlord_property_ids()` - Returns uuid[]; gets property_ids for current landlord user (defined in `003_landlord_auth.sql`)
- `update_unit_status()` - Trigger function; auto-sets unit status to 'occupied' or 'vacant' on business insert/update/delete (defined in `002_units_table.sql`)
- `prevent_landlord_code_write()` - Trigger function; nullifies landlord_code on properties insert/update (defined in `003_landlord_auth.sql`)
- `handle_new_user()` - Trigger function; auto-creates tenant profile row on auth.users insert (defined in `004_auto_profile_creation.sql`)

**Database Triggers:**
- `trg_business_unit_status` on `businesses` - Fires after insert/update/delete of unit_id; calls `update_unit_status()`
- `no_landlord_code` on `properties` - Fires before insert/update; calls `prevent_landlord_code_write()`
- `on_auth_user_created` on `auth.users` - Fires after insert; calls `handle_new_user()`

**Row-Level Security (RLS):**

All 14 tables have RLS enabled. Policy summary:

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `properties` | All authenticated | - | - | - |
| `units` | All authenticated | All authenticated | All authenticated | All authenticated |
| `businesses` | All authenticated | Owner email match | Owner email match | - |
| `posts` | All authenticated | All authenticated | - | - |
| `recommendations` | All authenticated | All authenticated | All authenticated | - |
| `notifications` | Own email only | All authenticated | Own email only | - |
| `ads` | All authenticated | - | - | - |
| `leases` | Landlord + property scoped | Landlord + property scoped | Landlord + property scoped | Landlord + property scoped |
| `recurring_payments` | Landlord + property scoped | Landlord + property scoped | Landlord + property scoped | Landlord + property scoped |
| `invoices` | Landlord + property scoped | Landlord + property scoped | Landlord + property scoped | Landlord + property scoped |
| `expenses` | Landlord + property scoped | Landlord + property scoped | Landlord + property scoped | Landlord + property scoped |
| `payments` | Landlord + property scoped | Landlord + property scoped | Landlord + property scoped | Landlord + property scoped |
| `activity_logs` | Own user_id | Own user_id | - | - |
| `profiles` | Own id | Service role only | - | - |
| `audit_log` | Landlord only | Landlord only | - (append-only) | - (append-only) |

**File Storage: Supabase Storage**
- Bucket: `public-assets`
- Upload path pattern: `uploads/{timestamp}-{random}.{ext}`
- Access: Fully public URLs via `getPublicUrl` (no signed URLs)
- Implementation: `src/services/storage.js`

**Caching: None**
- No Redis, Memcached, or other caching service
- Client-side caching managed by TanStack React Query

## Authentication & Identity

**Auth Provider:** Supabase Auth

**Auth Method:** Magic link (OTP via email)
- Login page: `src/pages/LandlordLogin.jsx`
- Uses `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })`
- Redirect target: `window.location.origin + '/LandlordDashboard'`

**Session Management:**
- Implementation: `src/lib/AuthContext.jsx`
- Sessions managed by Supabase Auth (stored in localStorage by the SDK)
- App checks for existing session on load via `supabase.auth.getSession()`
- Subscribes to real-time auth changes via `supabase.auth.onAuthStateChange()`
- Magic link callback detection: checks URL hash for `access_token` or query for `code=`

**User Roles:**
- Stored in `profiles` table (`role` column: 'tenant' or 'landlord')
- `property_ids` column (uuid[]) maps landlords to their properties
- Auto-created on signup via database trigger (`handle_new_user()`) with default role 'tenant'
- Landlord promotion: manual SQL via `scripts/seed-landlord.sql`

**Auth State (via `useAuth()` hook from `src/lib/AuthContext.jsx`):**
- `user` - Supabase user object (null if not authenticated)
- `isAuthenticated` - Boolean
- `isLoadingAuth` - Boolean (true during session check)
- `isLandlord` - Boolean (derived from `userRole === 'landlord'`)
- `userRole` - 'tenant' or 'landlord' (fetched from profiles table)
- `propertyIds` - uuid[] (landlord's assigned properties)
- `logout()` - Signs out, redirects to `/`
- `navigateToLogin()` - Redirects to `/LandlordLogin`

**Route Protection:**
- `src/components/guards/LandlordGuard.jsx` - Wraps landlord routes (Outlet pattern)
- Redirects unauthenticated users to `/LandlordLogin`
- Redirects non-landlord users to `/Welcome`
- Protected pages: LandlordDashboard, LandlordRequests, Accounting, AuditPage

**Property Context:**
- `src/lib/PropertyContext.jsx` - Provides `activePropertyId` and `switchProperty()` to landlord pages
- Persists selected property in `localStorage` key `active_property_id`
- Auto-selects first property if none active
- Switching invalidates all React Query caches

**Direct Supabase Auth Calls (bypass AuthContext):**
Several components call `supabase.auth.getSession()`/`getUser()` directly to get the current user email:
- `src/pages/Community.jsx`
- `src/pages/Register.jsx`
- `src/pages/MyCard.jsx`
- `src/pages/Recommendations.jsx`
- `src/lib/PageNotFound.jsx`
- `src/components/NotificationBell.jsx`

## Service Layer

**Location:** `src/services/`

**Pattern:** Each service file exports a named object literal with async methods that wrap Supabase client calls. All services import the singleton `supabase` from `./supabaseClient.js`.

**Service Inventory:**

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
| `leasesService` | `src/services/accounting.js` | `leases` | `filter()`, `create()`, `update()`, `delete()` |
| `recurringPaymentsService` | `src/services/accounting.js` | `recurring_payments` | `filter()`, `create()`, `update()`, `delete()` |
| `invoicesService` | `src/services/accounting.js` | `invoices` | `filter()`, `create()`, `update()`, `delete()` |
| `expensesService` | `src/services/accounting.js` | `expenses` | `filter()`, `create()`, `update()`, `delete()` |
| `paymentsService` | `src/services/accounting.js` | `payments` | `filter()`, `create()`, `update()`, `delete()` |

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
export const invoicesService = createAccountingService('invoices');
// ... etc
```

**Common Service Method Pattern:**
```javascript
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

## API Patterns

**How external services are called:**
- All Supabase calls use the JavaScript SDK (`@supabase/supabase-js`)
- No raw REST or GraphQL calls
- No Supabase Edge Functions or RPC calls
- No Supabase Realtime subscriptions (except auth state changes)

**Error handling for external calls:**
- Service methods: `if (error) throw error` -- surfaces Supabase errors to React Query
- React Query: catches thrown errors; exposes `isError` and `error` states
- `activityLogsService.logPageVisit()`: fire-and-forget with `.catch(() => {})`
- `writeAudit()` in `src/lib/AuditLogger.js`: callers append `.catch(() => {})` to avoid blocking primary mutations
- No global error handler or error boundary

**Rate limiting or retry logic:**
- React Query: `retry: 1` (one retry on failure)
- No client-side rate limiting
- No exponential backoff
- Supabase-side rate limits apply (managed by Supabase platform)

## Audit Logging

**Implementation:** `src/lib/AuditLogger.js`

**Pattern:**
```javascript
// src/lib/AuditLogger.js
export async function writeAudit({ entityType, entityId, action, oldValue, newValue, userId, userEmail }) {
  return supabase.from('audit_log').insert({ ... });
}
```

**Usage:** Called with `.catch(() => {})` after financial and request mutations to avoid blocking the primary operation. Writes to append-only `audit_log` table (no UPDATE or DELETE RLS policies).

**Entity types tracked:** recommendation, invoice, lease, expense, payment, recurring_payment
**Actions tracked:** created, updated, deleted, status_changed

**Viewer:** `src/pages/AuditPage.jsx` with `src/components/AuditLogTimeline.jsx` -- filterable by entity type, action, and search text.

## Navigation Tracking

**Implementation:** `src/lib/NavigationTracker.jsx`

**Behavior:**
- Renders as a null component in `src/App.jsx`
- Monitors `location` changes via React Router
- When authenticated, logs page visits via `activityLogsService.logPageVisit(pageName)`
- Maps URL paths to page names using `pagesConfig.Pages` keys
- Silently fails on logging errors (fire-and-forget)

## Monitoring & Observability

**Error Tracking:** None (no Sentry, Bugsnag, or similar)

**Logs:**
- Console only (`console.error` in AuthContext)
- Activity logging to `activity_logs` table (page visits only)
- Audit logging to `audit_log` table (financial/request mutations)
- No structured logging, no log levels, no external logging service

## CI/CD & Deployment

**Hosting:** Not detected in repository configuration

**CI Pipeline:** Not detected (no `.github/workflows/`, no `Dockerfile`, no deployment config)

**Build:** `npm run build` produces static files in `dist/`

## Environment Variables

| Variable | Service | Required | Template |
|----------|---------|----------|----------|
| `VITE_SUPABASE_URL` | Supabase | Yes | `.env.example` |
| `VITE_SUPABASE_ANON_KEY` | Supabase | Yes | `.env.example` |

**Env file locations:**
- `.env.example` - Template with placeholder values (committed to git)
- `.env.local` - Actual values (gitignored, contains secrets -- DO NOT read)

## Supabase Infrastructure Requirements

- PostgreSQL database with schema from all 6 migration files in `supabase/migrations/`
- Auth enabled with email OTP (magic link) support
- Storage bucket named `public-assets` with public access
- RLS policies applied per migration scripts
- Database triggers active (unit status, landlord_code prevention, auto profile creation)
- Helper functions deployed (`is_landlord()`, `landlord_property_ids()`)

## Webhooks & Callbacks

**Incoming:** None (no webhook endpoints; app is a client-side SPA)

**Outgoing:** None (no outbound webhook calls)

## Key Findings

- **Single external dependency** -- Supabase handles all backend needs (database, auth, storage); no other external APIs are called
- **No server-side logic** -- all business logic runs in the browser; no Supabase Edge Functions, no RPC calls, no server-side validation
- **Storage is fully public** -- uploaded files use `getPublicUrl` with no access control; any URL is world-accessible
- **Property-scoped RLS for financials** -- migration 003 tightened financial table access to landlords with matching property_ids
- **Units table RLS is still permissive** -- allows all authenticated users full CRUD (needs tightening to landlord-only for write operations)
- **Scattered auth calls** -- 6 files call `supabase.auth.getSession()`/`getUser()` directly instead of using the `useAuth()` hook; user email should be centralized in AuthContext
- **Audit log is append-only** -- enforced at RLS level (no UPDATE or DELETE policies); good security practice
- **Stripe integration is staged** -- packages installed but zero integration code; will need Supabase Edge Functions for server-side payment processing when implemented

---

*Integration audit: 2026-03-27*
