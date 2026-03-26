# Concerns & Technical Debt

> Generated: 2026-03-25 | Focus: concerns

## Overview

The UNIT codebase recently migrated from Base44 BaaS to Supabase. The migration is complete at the import level -- no Base44 references remain in source code, and all services now use the Supabase client. However, several critical structural issues carry over or were introduced: RLS policies are overly permissive on financial tables, landlord authentication is entirely client-side (any authenticated user can read landlord codes), there are zero tests, and significant code duplication exists across pages. The service layer is clean but thin -- it lacks validation, authorization checks, and error handling beyond raw Supabase throws.

---

## Critical Issues

### C1. Landlord Authentication is Client-Side Only -- Any Tenant Can Access Any Landlord Dashboard

- **Files:** `src/pages/LandlordLogin.jsx` (lines 20-24, 31-36), `src/pages/LandlordDashboard.jsx` (lines 37-42)
- **Issue:** `LandlordLogin` fetches ALL properties via `propertiesService.list()`, then compares the `landlord_code` column against user input in the browser (line 32: `properties.find(p => p.landlord_code === code)`). The `properties` table RLS policy grants SELECT to all authenticated users, so every `landlord_code` for every property is exposed to any tenant in network responses. After matching, the property ID is stored in `sessionStorage` with no server-side validation.
- **Impact:** Complete bypass of landlord access control. Any authenticated tenant can inspect the properties API response, extract any property's `landlord_code`, and gain full landlord access to dashboards, accounting, leases, and financial data.
- **Fix approach:** Move landlord authentication to a Supabase Edge Function or RPC that verifies the code server-side and returns a session token. Never expose `landlord_code` in client-side queries (remove it from the `properties` table SELECT or create a separate `landlord_credentials` table with restricted RLS). Add a `landlord_sessions` table with server-verified tokens and expiry.

### C2. RLS Policies Allow Any Authenticated User Full CRUD on Financial Tables

- **Files:** `supabase/migrations/001_initial_schema.sql` (lines 296-336)
- **Issue:** All financial tables (`leases`, `recurring_payments`, `invoices`, `expenses`, `payments`) have RLS policies using `using (true)` and `with check (true)` for all operations. Any authenticated user (including regular tenants) can SELECT, INSERT, UPDATE, and DELETE financial records for ANY property. Schema comments acknowledge this: "For now, allow all authenticated users (tighten with landlord roles later)".
- **Tables affected:** `leases`, `recurring_payments`, `invoices`, `expenses`, `payments`
- **Impact:** Data integrity and confidentiality breach. A regular tenant can read, modify, or delete any property's financial records via direct Supabase API calls.
- **Fix approach:** Implement a `property_managers` table linking `user_id` to `property_id`. Replace permissive policies with role-checked RLS: `using (property_id in (select property_id from property_managers where user_id = auth.uid()))`.

### C3. Posts and Recommendations INSERT Policies Allow Cross-Property Impersonation

- **Files:** `supabase/migrations/001_initial_schema.sql` (lines 265-267, 272-274)
- **Issue:** INSERT policies on `posts` and `recommendations` use `with check (true)`, meaning any authenticated user can create posts or recommendations for ANY property and any `business_id`, even businesses they don't own. The `business_id` is set client-side without server verification.
- **Impact:** A user from Property A can create posts appearing to be from a business on Property B. Spoofed recommendations could trigger false landlord notifications.
- **Fix approach:** Tighten INSERT policies: `with check (business_id in (select id from businesses where owner_email = auth.jwt()->>'email'))`.

### C4. No Input Validation in Service Layer -- Zod Installed but Unused

- **Files:** All `src/services/*.js` files, `package.json` (zod @ 3.24.2)
- **Issue:** Service functions pass user-provided data directly to Supabase INSERT/UPDATE calls with zero validation. No Zod schemas, no field whitelisting, no type checking. The `zod` package is installed but completely unused. The `react-hook-form` and `@hookform/resolvers` packages are also installed but unused -- all forms use raw `useState`.
- **Impact:** Malformed data, potential injection via unvalidated fields, and data integrity issues. Users could pass arbitrary fields not in the schema.
- **Fix approach:** Create Zod schemas for each entity (e.g., `businessSchema`, `postSchema`) in a shared `src/schemas/` directory. Validate in service `create`/`update` functions before calling Supabase. Whitelist allowed fields.

### C5. Supabase Client Created with Potentially Undefined Values

- **Files:** `src/services/supabaseClient.js` (lines 6-10)
- **Issue:** If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are missing, the code logs a `console.error` but still calls `createClient(undefined, undefined)` on line 10. This creates a broken client instance that will cause cryptic errors throughout the app.
- **Impact:** App fails silently or with unhelpful errors if env vars are misconfigured. Difficult to debug in production.
- **Fix approach:** Throw an explicit error to prevent the app from loading: `throw new Error('Missing required Supabase environment variables')`.

---

## Warnings

### W1. Duplicated `currentUser` Query Across 5 Files -- Bypasses AuthContext

- **Files:** `src/pages/Community.jsx` (line 48), `src/pages/Register.jsx` (line 57), `src/pages/MyCard.jsx` (line 40), `src/pages/Recommendations.jsx` (line 39), `src/components/NotificationBell.jsx` (line 15)
- **Issue:** Each file independently queries Supabase for the current user with `queryKey: ['currentUser']` using identical `getSession()` then `getUser()` logic. This duplicates the auth state that `AuthContext` already manages -- `src/lib/AuthContext.jsx` sets `user` state via `onAuthStateChange` and exposes it via `useAuth()`.
- **Impact:** 5 redundant auth API calls per page load. Inconsistent user state if one query returns stale data. Maintenance burden (5 identical code blocks to update if auth flow changes).
- **Fix approach:** Use `const { user } = useAuth()` from the existing `AuthContext`. Remove all `currentUser` query blocks.

### W2. `getCategoryLabel()` Duplicated in 4 Files

- **Files:** `src/pages/BrowseProperties.jsx` (line 59), `src/pages/Profile.jsx` (line 45), `src/pages/MyCard.jsx` (line 75), `src/components/BusinessCard.jsx` (line 10)
- **Issue:** The exact same category-to-label mapping object is independently defined in 4 files.
- **Impact:** Adding a new business category requires editing 4+ files. Risk of mapping divergence.
- **Fix approach:** Create `src/lib/categories.js` exporting `CATEGORIES` (the list with `{value, label}`) and `getCategoryLabel()` helper. The categories array is also duplicated in Register, MyCard, Directory, and LandlordDashboard.

### W3. No `onError` Handlers on Any Mutation

- **Files:** Every page using `useMutation` -- `src/pages/Accounting.jsx` (16 mutations, none with `onError`), `src/pages/Community.jsx`, `src/pages/Register.jsx`, `src/pages/MyCard.jsx`, `src/pages/Recommendations.jsx`, `src/pages/LandlordRequests.jsx`, `src/pages/Directory.jsx`
- **Issue:** Not a single `useMutation` call in the entire codebase includes an `onError` callback. Failed mutations are silently swallowed by React Query's default behavior. Users receive no feedback.
- **Impact:** Users think operations succeeded when they failed. Data loss from perceived-but-not-actual saves. Particularly dangerous for financial operations in Accounting.
- **Fix approach:** Add `onError` callbacks with toast notifications: `onError: (error) => toast.error(error.message || 'Operation failed')`. Consider adding a global `onMutationError` handler on the `QueryClient` in `src/lib/query-client.js`.

### W4. No React Error Boundaries

- **Files:** `src/App.jsx`, `src/main.jsx`
- **Issue:** No error boundary wraps the application or any sub-tree. Any unhandled JavaScript error in a component render will crash the entire app with a white screen and no recovery path.
- **Impact:** Poor user experience on any runtime error. No way to recover without a full page refresh.
- **Fix approach:** Add an `ErrorBoundary` component wrapping `AuthenticatedApp` that catches errors and shows a recovery UI with a "Reload" button.

### W5. Oversized Page Components (6 files over 300 lines)

- **Files:** `src/pages/Accounting.jsx` (693 lines), `src/pages/LandlordDashboard.jsx` (537 lines), `src/pages/Register.jsx` (448 lines), `src/pages/MyCard.jsx` (437 lines), `src/pages/Directory.jsx` (354 lines), `src/pages/BrowseProperties.jsx` (342 lines)
- **Issue:** `Accounting.jsx` alone defines 16 mutations, 7 queries, and 8 state variables for modals, all inline. `LandlordDashboard.jsx` computes 6+ derived data calculations inline.
- **Impact:** Hard to read, test, and maintain. High risk of bugs during modifications.
- **Fix approach:** Extract mutations and data calculations into custom hooks (e.g., `useAccountingMutations()`, `useLandlordStats()`). Extract repeated list/card rendering patterns into sub-components.

### W6. `window.location.search` Used Instead of React Router in 9 Pages

- **Files:** `src/pages/Accounting.jsx` (line 32), `src/pages/Community.jsx` (line 33), `src/pages/Directory.jsx` (line 34), `src/pages/LandlordDashboard.jsx` (line 33), `src/pages/LandlordRequests.jsx` (line 26), `src/pages/MyCard.jsx` (line 33), `src/pages/Profile.jsx` (line 26), `src/pages/Recommendations.jsx` (line 23), `src/pages/Register.jsx` (line 23)
- **Issue:** Every page parses query parameters using `new URLSearchParams(window.location.search)` instead of React Router's `useSearchParams()` hook. This bypasses React's reactivity system.
- **Impact:** URL parameter changes via `navigate()` within the same route may not trigger re-renders. The component reads stale params on some navigation scenarios.
- **Fix approach:** Replace with `const [searchParams] = useSearchParams()` from `react-router-dom` in all page components.

### W7. Landlord Session Uses sessionStorage with No Expiry or Server Validation

- **Files:** `src/pages/LandlordLogin.jsx` (line 36), `src/pages/LandlordDashboard.jsx` (lines 38-42)
- **Issue:** Landlord session stored as `landlord_property_id` in `sessionStorage` with no expiration, no CSRF protection, and no server-side validation. The dashboard's session check (line 39) only compares `storedPropertyId !== propertyId` -- it doesn't verify the user actually authenticated as a landlord.
- **Impact:** Session persists until tab close with no timeout. Combined with C1 (exposed landlord codes), creates a persistent access vulnerability.
- **Fix approach:** Use Supabase auth custom claims or a server-side `landlord_sessions` table with timestamps. Add session expiry (e.g., 24 hours). Validate on every protected page load.

### W8. No Pagination on Any Data Query

- **Files:** All `src/services/*.js` files, all page components using `useQuery`
- **Issue:** Every query fetches ALL records with `select('*')` and no `.range()` or `.limit()`. The `notificationsService.filter()` accepts a `limit` parameter, but most callers don't use it. `Accounting.jsx` fetches 7 complete entity collections on mount.
- **Impact:** Performance degrades linearly with data growth. A property with hundreds of posts, invoices, or businesses sends all records over the wire on every page load.
- **Fix approach:** Add `.range(from, to)` to service queries. Implement pagination in the UI. Start with the highest-volume tables: posts, notifications, invoices.

### W9. Storage Upload Has No File Size or Type Server-Side Validation

- **Files:** `src/services/storage.js` (lines 4-19), `src/pages/Register.jsx` (line 259)
- **Issue:** `storageService.uploadFile()` accepts any file with no size limit, no MIME type validation, and no file extension whitelist. The client-side `accept="image/*"` attribute is trivially bypassed.
- **Impact:** Users could upload extremely large files (consuming storage quota), non-image files, or potentially malicious files.
- **Fix approach:** Add file size validation (e.g., 5MB max) and MIME type checking in `storageService` before upload. Configure Supabase storage bucket policies for additional server-side enforcement.

### W10. `moment` and `date-fns` Both in Bundle

- **Files:** `package.json` (moment @ 2.30.1, date-fns @ 3.6.0), `src/components/NotificationBell.jsx` (line 8 -- uses `moment`), `src/components/PostCard.jsx` (line 6 -- uses `date-fns`)
- **Issue:** Two date libraries coexist. `moment` is used in only one file (`NotificationBell.jsx`) for `fromNow()`. `date-fns` is used in `PostCard.jsx` for `format()`. `moment` adds ~70KB minified+gzipped to the bundle.
- **Fix approach:** Replace `moment(date).fromNow()` with `formatDistanceToNow(new Date(date), { addSuffix: true })` from `date-fns`. Remove `moment` from dependencies.

### W11. Duplicate Migration File Numbering

- **Files:** `supabase/migrations/002_seed_properties.sql`, `supabase/migrations/002_units_table.sql`
- **Issue:** Two migration files share the `002` prefix with different names. Migration ordering is ambiguous -- if run alphabetically, the seed runs before the units table exists.
- **Impact:** Schema migration failures or incorrect ordering depending on the migration runner.
- **Fix approach:** Renumber to sequential: `002_units_table.sql`, `003_seed_properties.sql`, `004_seed_decker_properties.sql`. Or remove `002_seed_properties.sql` since `003_seed_decker_properties.sql` supersedes it with more detailed data.

### W12. JSON.parse Without Try-Catch in LandlordNotificationBell

- **Files:** `src/components/LandlordNotificationBell.jsx` (line 17)
- **Issue:** `JSON.parse(stored)` is called on localStorage data without try-catch. Corrupted localStorage data will throw and crash the component.
- **Impact:** Landlord notification bell crashes if localStorage contains corrupted data.
- **Fix approach:** Wrap in try-catch: `try { setDismissedIds(JSON.parse(stored)); } catch { setDismissedIds([]); }`.

---

## Info

### I1. 14+ Unused npm Dependencies (Bundle Bloat)

- **Files:** `package.json`
- **Unused packages (zero imports found in `src/`):**
  - `@stripe/react-stripe-js` + `@stripe/stripe-js` -- Stripe SDK, never imported
  - `three` -- 3D library, never imported
  - `react-leaflet` -- Map library, never imported
  - `react-quill` -- Rich text editor, never imported
  - `react-markdown` -- Markdown renderer, never imported
  - `html2canvas` -- HTML-to-image, never imported
  - `jspdf` -- PDF generation, never imported
  - `next-themes` -- Next.js theme switching, never imported
  - `canvas-confetti` -- Confetti animation, never imported
  - `react-hook-form` + `@hookform/resolvers` -- Form library, never imported (forms use `useState`)
  - `react-resizable-panels` -- Resizable panels, never imported
  - `@hello-pangea/dnd` -- Drag-and-drop, never imported
  - `input-otp` -- OTP input, never imported
- **Impact:** Bloated `node_modules`. While tree-shaking should prevent most from entering the production bundle, some (like Stripe) may still add weight if they have side effects.
- **Fix approach:** `npm uninstall three react-leaflet react-quill react-markdown html2canvas jspdf @stripe/react-stripe-js @stripe/stripe-js next-themes canvas-confetti react-hook-form @hookform/resolvers react-resizable-panels @hello-pangea/dnd input-otp`

### I2. React.StrictMode Not Enabled

- **Files:** `src/main.jsx`
- **Issue:** The app renders without `<React.StrictMode>`, missing double-render warnings that catch side-effect bugs during development.
- **Fix approach:** Wrap `<App />` in `<React.StrictMode>`.

### I3. Zero Test Files in Project

- **Files:** No test files exist in `src/` or project root
- **Issue:** No unit tests, integration tests, or E2E tests. No test framework configured (no vitest, jest, or playwright config).
- **Impact:** All changes are manually verified. Regressions go undetected. Refactoring is high-risk.
- **Fix approach:** Add Vitest (compatible with Vite). Start with service layer unit tests and critical flow integration tests.

### I4. `PageNotFound` Admin Check Will Never Show

- **Files:** `src/lib/PageNotFound.jsx` (lines 10-20, 43)
- **Issue:** The 404 page independently queries `supabase.auth.getUser()` instead of using `useAuth()`. It then checks `user?.role === 'admin'` but Supabase auth users don't have a `role` field by default -- this check always fails.
- **Impact:** The "Admin Note" about AI-generated pages never displays.
- **Fix approach:** Use `useAuth()` for user state. Either implement a proper admin role system or remove the admin note.

### I5. Hardcoded Marketing Stats on Welcome Page

- **Files:** `src/pages/Welcome.jsx` (lines 142-143)
- **Issue:** Stats section shows "500+ Businesses" and "1000+ Connections" as hardcoded text, not from actual data.
- **Impact:** Misleading marketing metrics for a newly-launched app.
- **Fix approach:** Either remove the stats section or compute from query data (e.g., count of all businesses across properties).

### I6. Inline Logo Markup Instead of UnitLogo Component

- **Files:** Inline logo in `src/pages/Community.jsx` (lines 162-166), `src/pages/Directory.jsx` (lines 122-129), `src/pages/Recommendations.jsx` (lines 132-138), `src/pages/MyCard.jsx` (lines 137-143, 178-183), `src/pages/BrowseProperties.jsx` (lines 81-84, 249-254)
- **Issue:** 6+ pages render the "U" logo badge manually with inline JSX instead of using the shared `src/components/UnitLogo.jsx` component.
- **Impact:** Brand inconsistency if logo styling changes; must update every inline instance.
- **Fix approach:** Replace all inline logo markup with `<UnitLogo />`.

### I7. Notifications Table Keyed on `user_email` Instead of `user_id`

- **Files:** `supabase/migrations/001_initial_schema.sql` (line 91), `src/services/notifications.js` (line 39)
- **Issue:** The `notifications` table uses `user_email` as the user identifier rather than `user_id` referencing `auth.users`. RLS policies also use `auth.jwt()->>'email'` instead of `auth.uid()`.
- **Impact:** If a user changes their email, they lose access to all prior notifications. No foreign key constraint to `auth.users`.
- **Fix approach:** Add a `user_id uuid references auth.users(id)` column. Update RLS to use `auth.uid()`. Migrate existing notifications.

### I8. No Unique Constraint on Business Owner Per Property

- **Files:** `supabase/migrations/001_initial_schema.sql` (lines 26-43)
- **Issue:** No unique constraint on `(owner_email, property_id)` in the `businesses` table. A user could register multiple businesses at the same property. Code assumes `businesses[0]` is the user's only business (e.g., `src/pages/Community.jsx` line 67, `src/pages/Recommendations.jsx` line 54).
- **Impact:** Multiple business profiles per user per property could cause data confusion and unexpected behavior.
- **Fix approach:** Add constraint: `alter table businesses add constraint uq_business_owner_property unique (owner_email, property_id)`.

### I9. Seed Migration Conflicts Between 002 and 003

- **Files:** `supabase/migrations/002_seed_properties.sql`, `supabase/migrations/003_seed_decker_properties.sql`
- **Issue:** Both migrations seed properties with overlapping data (e.g., "Vero" vs "VD Vero, LLC" at the same address). Migration 002 uses raw INSERT with no conflict handling. Migration 003 uses `ON CONFLICT DO NOTHING`. Running both creates duplicate records.
- **Impact:** Duplicate property records in the database.
- **Fix approach:** Remove `002_seed_properties.sql` (superseded by the more detailed `003_seed_decker_properties.sql` migration).

### I10. Mixed Light/Dark Styling in Accounting Page Tabs

- **Files:** `src/pages/Accounting.jsx` (lines 291-401 vs 234-252)
- **Issue:** The Accounting page header and Reports/Leases tabs use dark theme (`bg-white/5`, `text-white`), but the Recurring Payments, Invoices, and Expenses tabs use light-mode colors (`bg-white`, `bg-gray-50`, `text-gray-900`).
- **Impact:** Inconsistent visual appearance within the same page.
- **Fix approach:** Standardize all tab content to use the dark theme matching the rest of the app.

### I11. `units` Table Missing from Some RLS Awareness

- **Files:** `supabase/migrations/002_units_table.sql` (bottom section)
- **Issue:** The `units` table has fully permissive RLS (any authenticated user can CRUD all units). While this is documented as intentional for now, it means any tenant could potentially modify unit statuses across properties.
- **Impact:** Low immediate risk since no UI exposes unit mutation to tenants, but the API surface is unprotected.
- **Fix approach:** Tighten to property-manager-only write access when roles are implemented.

---

## Recommendations

**Priority 1 -- Security (address immediately):**
1. Fix landlord authentication to server-side verification (C1)
2. Tighten RLS policies on financial tables with role-based access (C2)
3. Add business ownership checks on post/recommendation inserts (C3)
4. Fix Supabase client creation to throw on missing env vars (C5)

**Priority 2 -- Data Integrity & User Experience:**
5. Add Zod validation in service layer (C4)
6. Add `onError` handlers on all mutations with toast feedback (W3)
7. Add React Error Boundary (W4)
8. Fix `JSON.parse` without try-catch (W12)

**Priority 3 -- Code Quality & Maintenance:**
9. Consolidate `currentUser` queries to use `useAuth()` (W1)
10. Centralize category labels/lists into shared module (W2)
11. Replace `window.location.search` with `useSearchParams()` (W6)
12. Remove `moment`, standardize on `date-fns` (W10)
13. Split oversized page components into hooks + sub-components (W5)

**Priority 4 -- Infrastructure & Cleanup:**
14. Remove 14+ unused npm dependencies (I1)
15. Add Vitest and initial test coverage for services (I3)
16. Fix migration file numbering and seed conflicts (W11, I9)
17. Add pagination to high-volume queries (W8)
18. Enable React.StrictMode (I2)

---

*Concerns audit: 2026-03-25*
