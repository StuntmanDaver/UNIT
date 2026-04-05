# Codebase Concerns

**Analysis Date:** 2026-03-27

## Critical Issues

### C1. Posts, Recommendations, and Notifications INSERT Policies Allow Cross-Property Impersonation

- **Severity:** Critical
- **Location:** `supabase/migrations/001_initial_schema.sql` (lines 265-267, 272-276, 283-284)
- **Description:** INSERT policies on `posts`, `recommendations`, and `notifications` use `with check (true)`, meaning any authenticated user can create records for ANY property and any `business_id`, including businesses they do not own. The `business_id` is set client-side in `src/pages/Community.jsx` (line 97) and `src/pages/Recommendations.jsx` (line 83) without server-side verification. Recommendations UPDATE is also fully permissive (`using (true)`), so any tenant could change any recommendation's status.
- **Impact:** A user from Property A can create posts appearing to be from a business on Property B. Spoofed recommendations could trigger false landlord notifications. Any authenticated tenant can update any recommendation status.
- **Recommendation:** Tighten INSERT policies to verify business ownership: `with check (business_id in (select id from businesses where owner_email = auth.jwt()->>'email'))`. Tighten recommendations UPDATE to allow status changes only by landlords who manage that property.

### C2. Units Table RLS is Fully Permissive -- Any Tenant Can CRUD All Units

- **Severity:** High
- **Location:** `supabase/migrations/002_units_table.sql` (lines 110-121)
- **Description:** All four RLS policies on the `units` table use `using (true)` and `with check (true)`. Any authenticated user (including regular tenants) can INSERT, UPDATE, and DELETE unit records for any property via direct Supabase API calls. This is acknowledged in comments as temporary.
- **Impact:** A malicious tenant could alter unit statuses, create phantom units, or delete real ones. The `update_unit_status()` trigger means changing units also cascades to business-unit associations.
- **Recommendation:** Restrict write operations to landlords who manage the property: `using (is_landlord() and property_id = any(landlord_property_ids()))`. Keep SELECT open for authenticated users.

### C3. No Input Validation in Service Layer -- Zod Installed but Unused

- **Severity:** High
- **Location:** All `src/services/*.js` files, `package.json` (zod @ 3.24.2, react-hook-form @ 7.54.2, @hookform/resolvers @ 4.1.2)
- **Description:** Service functions pass user-provided data directly to Supabase INSERT/UPDATE calls with zero validation. No Zod schemas, no field whitelisting, no type checking. The `zod`, `react-hook-form`, and `@hookform/resolvers` packages are installed but completely unused -- all forms use raw `useState` with HTML-only validation (`required`, `type="email"`).
- **Impact:** Malformed data can be persisted. Arbitrary fields not in the schema could be submitted. No client-side defense against bad input beyond browser `required` attributes.
- **Recommendation:** Create Zod schemas for each entity in `src/schemas/`. Validate in service `create`/`update` functions before calling Supabase. Whitelist allowed fields. Optionally adopt `react-hook-form` with `zodResolver` for form-level validation.

### C4. AuditPage Query Fetches ALL Audit Entries Without Property Scoping

- **Severity:** High
- **Location:** `src/pages/AuditPage.jsx` (lines 37-41)
- **Description:** The AuditPage queries `audit_log` with `select('*').order(...).limit(100)` but does not filter by the active property. Since audit_log RLS allows all landlords to read all entries (the policy checks `is_landlord()` only, not property_id), a landlord managing Property A can see audit entries for Property B.
- **Impact:** Cross-property data leakage of financial and operational activity for landlords with access to multiple properties (or any landlord if they share a Supabase project).
- **Recommendation:** Add a `property_id` column to `audit_log` table. Update `writeAudit()` in `src/lib/AuditLogger.js` to include property_id. Update RLS to scope by `landlord_property_ids()`. Filter by `activePropertyId` in the AuditPage query.

## Security Concerns

### S1. Storage Upload Has No File Size or Type Validation

- **Severity:** Medium
- **Location:** `src/services/storage.js` (lines 4-19), `src/pages/Register.jsx` (line 258)
- **Description:** `storageService.uploadFile()` accepts any file with no size limit, no MIME type validation, and no file extension whitelist. The only protection is `accept="image/*"` in the Register page HTML, which is trivially bypassed. No Supabase Storage bucket policies are configured for server-side enforcement.
- **Impact:** Users could upload extremely large files (consuming storage quota and bandwidth), non-image files, or potentially malicious payloads.
- **Recommendation:** Add pre-upload validation in `storageService`: check `file.size <= 5 * 1024 * 1024` (5MB) and `file.type.startsWith('image/')`. Configure Supabase Storage bucket policies for server-side file size and MIME type restrictions.

### S2. Landlord Login Has No Rate Limiting on OTP Sends

- **Severity:** Medium
- **Location:** `src/pages/LandlordLogin.jsx` (lines 23-28)
- **Description:** The magic link OTP send (`supabase.auth.signInWithOtp`) has no client-side throttling. A user can click "Send Magic Link" repeatedly or script the endpoint to flood any email address with OTP emails. Supabase has built-in rate limits but they are generous by default.
- **Impact:** Email abuse vector. Potential to exhaust Supabase email sending quotas.
- **Recommendation:** Add client-side cooldown (disable button for 60s after send). Verify Supabase project has appropriate OTP rate limits configured in the dashboard.

### S3. LandlordNotificationBell JSON.parse Without Try-Catch

- **Severity:** Low
- **Location:** `src/components/LandlordNotificationBell.jsx` (line 17)
- **Description:** `JSON.parse(stored)` is called on localStorage data without error handling. Corrupted localStorage data will throw a SyntaxError and crash the component tree.
- **Impact:** Landlord notification bell crashes if localStorage contains corrupted data, potentially breaking the entire dashboard header.
- **Recommendation:** Wrap in try-catch: `try { setDismissedIds(JSON.parse(stored)); } catch { setDismissedIds([]); }`.

## Performance Concerns

### P1. No Pagination on Any Data Query

- **Severity:** High
- **Location:** All `src/services/*.js` files, all page components
- **Description:** Every query fetches ALL records with `select('*')` and no `.range()`. Only three places use `.limit()`: `src/services/notifications.js` (optional param), `src/pages/AuditPage.jsx` (limit 100), and `src/pages/Accounting.jsx` (audit entries limit 20). `Accounting.jsx` fetches 7 complete entity collections on mount. `LandlordDashboard.jsx` fetches 6 collections.
- **Impact:** Performance degrades linearly with data growth. A property with hundreds of posts, invoices, or businesses sends all records over the wire on every page load.
- **Recommendation:** Add `.range(from, to)` to service filter methods. Implement cursor-based or offset pagination in the UI. Start with highest-volume tables: `posts`, `notifications`, `invoices`, `recommendations`.

### P2. `moment` Library Adds ~70KB for One Usage

- **Severity:** Medium
- **Location:** `package.json` (moment @ 2.30.1), `src/components/NotificationBell.jsx` (line 8)
- **Description:** Two date libraries coexist: `moment` used in one file (`NotificationBell.jsx`) for `moment(date).fromNow()`, and `date-fns` (already a dependency) for `format()` in other components. `moment` is ~70KB minified+gzipped and is not tree-shakeable.
- **Impact:** Unnecessary bundle size for a single relative-time formatting call.
- **Recommendation:** Replace `moment(date).fromNow()` with `formatDistanceToNow(new Date(date), { addSuffix: true })` from `date-fns`. Then `npm uninstall moment`.

### P3. 14+ Unused npm Dependencies (Bundle Bloat Risk)

- **Severity:** Medium
- **Location:** `package.json`
- **Description:** The following installed packages have zero imports in `src/`:
  - `@stripe/react-stripe-js` + `@stripe/stripe-js` (Stripe SDK)
  - `three` (3D library)
  - `react-leaflet` (maps)
  - `react-quill` (rich text editor)
  - `react-markdown` (markdown renderer)
  - `html2canvas` (HTML-to-image)
  - `jspdf` (PDF generation)
  - `next-themes` (Next.js theme switching -- not even a Next.js app)
  - `canvas-confetti` (confetti animation)
  - `react-hook-form` + `@hookform/resolvers` (form library, forms use useState)
  - `react-resizable-panels` (resizable panels)
  - `@hello-pangea/dnd` (drag-and-drop)
  - `input-otp` (OTP input)
  - `lodash` (utility library)
- **Impact:** Bloated `node_modules` and `package-lock.json`. Most are tree-shaken from the production bundle, but packages with side effects (Stripe) may not be.
- **Recommendation:** Run `npm uninstall` on all unused packages in a single cleanup commit.

## Maintainability Concerns

### M1. Oversized Page Components (6 Files Over 300 Lines)

- **Severity:** High
- **Location:** `src/pages/Accounting.jsx` (724 lines), `src/pages/LandlordDashboard.jsx` (531 lines), `src/pages/Register.jsx` (448 lines), `src/pages/MyCard.jsx` (437 lines), `src/components/accounting/FinancialReports.jsx` (446 lines), `src/pages/Directory.jsx` (355 lines)
- **Description:** `Accounting.jsx` defines 12 mutation hooks, 7 query hooks, 8 modal state variables, and renders 5 tab panels all in a single component. `LandlordDashboard.jsx` computes 6+ derived data calculations inline (occupancy, categories, request stats, lease expiry, payment stats, unit grouping).
- **Impact:** Difficult to read, test, or modify safely. High risk of introducing bugs during feature changes. Impossible to unit test individual pieces.
- **Recommendation:** Extract mutations and queries into custom hooks (e.g., `useAccountingQueries()`, `useAccountingMutations()`). Extract tab panels into sub-components (e.g., `LeasesTab.jsx`, `InvoicesTab.jsx`). Extract derived calculations into pure utility functions.

### M2. `getCategoryLabel` / `categoryLabels` Duplicated in 6+ Files

- **Severity:** Medium
- **Location:** `src/pages/MyCard.jsx` (line 75), `src/pages/Profile.jsx` (line 45), `src/pages/BrowseProperties.jsx` (line 59), `src/pages/LandlordDashboard.jsx` (line 100), `src/components/BusinessCard.jsx` (line 10), `src/components/accounting/FinancialReports.jsx` (line 81)
- **Description:** The identical category-to-label mapping (`{ manufacturing: 'Manufacturing', logistics: 'Logistics', ... }`) is independently defined in 6+ files. The categories list for Select dropdowns is also duplicated in `src/pages/Register.jsx` (line 98) and `src/pages/MyCard.jsx` (line 354).
- **Impact:** Adding a new business category requires editing 6+ files. High risk of mapping divergence between tenant-facing and landlord-facing views.
- **Recommendation:** Create `src/lib/categories.js` exporting `CATEGORIES` (array of `{value, label}`) and a `getCategoryLabel(key)` helper. Import everywhere.

### M3. `getBusinessName()` Helper Duplicated in 3 Pages

- **Severity:** Low
- **Location:** `src/pages/LandlordDashboard.jsx` (line 162), `src/pages/Accounting.jsx` (line 221), `src/pages/LandlordRequests.jsx` (line 76)
- **Description:** Each file defines identical `getBusinessName(businessId)` that finds a business by ID and returns its name or a fallback string.
- **Impact:** Minor, but contributes to code repetition pattern.
- **Recommendation:** Extract to a shared utility function or pass business names directly via React Query join/select.

### M4. Duplicated `currentUser` Query Pattern Across 5 Files -- Bypasses AuthContext

- **Severity:** Medium
- **Location:** `src/pages/Community.jsx` (line 48), `src/pages/Register.jsx` (line 57), `src/pages/MyCard.jsx` (line 40), `src/pages/Recommendations.jsx` (line 39), `src/components/NotificationBell.jsx` (line 15)
- **Description:** Each file independently queries Supabase for the current user with `queryKey: ['currentUser']` using identical `getSession()` then `getUser()` logic. AuthContext already manages user state and exposes it via `useAuth()`. These 5 files bypass it entirely.
- **Impact:** 5 redundant auth API calls per page load (one per component). Inconsistent user state if one returns stale data while AuthContext has updated. All 5 code blocks must be updated if auth flow changes.
- **Recommendation:** Replace all `currentUser` query blocks with `const { user } = useAuth()`.

### M5. `window.location.search` Used Instead of React Router in 7+ Pages

- **Severity:** Medium
- **Location:** `src/pages/Community.jsx` (line 33), `src/pages/Directory.jsx` (line 35), `src/pages/MyCard.jsx` (line 33), `src/pages/Profile.jsx` (line 26), `src/pages/Recommendations.jsx` (line 23), `src/pages/Register.jsx` (line 23), `src/pages/Accounting.jsx` (line 35)
- **Description:** Tenant pages parse query parameters using `new URLSearchParams(window.location.search)` instead of React Router's `useSearchParams()` hook. This bypasses React's reactivity system.
- **Impact:** URL parameter changes via in-app navigation may not trigger re-renders. Pages read stale params on some client-side routing scenarios. Note: landlord pages (`LandlordDashboard`, `LandlordRequests`) correctly use `useProperty()` context instead.
- **Recommendation:** Replace with `const [searchParams] = useSearchParams()` from `react-router-dom` in all tenant page components.

### M6. Two Toast Systems Coexist

- **Severity:** Low
- **Location:** `package.json` has both `react-hot-toast` (2.6.0) and `sonner` (2.0.1). App uses `src/components/ui/toaster.jsx` (Radix-based) and `src/components/ui/sonner.jsx` (Sonner-based). Only the Radix-based `<Toaster />` is mounted in `src/App.jsx` (line 100).
- **Description:** Three toast libraries are available (`react-hot-toast`, `sonner`, and the Radix UI-based custom `useToast`), but only the Radix one is active. No page currently calls any toast function on mutations.
- **Impact:** Developer confusion about which toast API to use. Two unused toast packages in dependencies.
- **Recommendation:** Standardize on the Radix-based `useToast` (already mounted in App). Remove `react-hot-toast` and `sonner` from dependencies. Then add toast calls in mutation `onSuccess`/`onError` handlers.

## Scalability Concerns

### SC1. Notification Fan-Out Done Client-Side

- **Severity:** Medium
- **Location:** `src/pages/Community.jsx` (lines 100-113), `src/pages/Recommendations.jsx` (lines 86-99)
- **Description:** When a user creates a post or recommendation, the mutation function iterates over all other businesses in the property and creates individual notification records client-side via `Promise.all(otherBusinesses.map(...))`. For a property with 100 tenants, this fires 99 individual INSERT calls.
- **Impact:** Slow mutation execution for large properties. Network failures mid-fan-out leave partial notification state. Client timeout risk.
- **Recommendation:** Move notification fan-out to a Supabase Edge Function or database trigger. The client should make a single API call; the server handles broadcasting.

### SC2. Tenant Pages Rely on URL Query Parameter for Property Scoping

- **Severity:** Medium
- **Location:** `src/pages/Community.jsx` (line 34), `src/pages/Directory.jsx` (line 36), `src/pages/Recommendations.jsx` (line 24), `src/pages/Register.jsx` (line 24)
- **Description:** All tenant-facing pages read `propertyId` from `?propertyId=xxx` in the URL. There is no server-side enforcement that the user belongs to this property. Any tenant can access any property's community feed, directory, or recommendations by changing the URL parameter.
- **Impact:** No property isolation for tenant data viewing. While RLS ensures they can only see records (not modify others'), the lack of scoping means all tenant data across all properties is browsable.
- **Recommendation:** Either add property membership enforcement (a user-to-property mapping table) or accept this as intentional for an open-community model. Document the decision either way.

## Dependency Risks

### D1. `react-quill` 2.0.0 is Unmaintained and Uses Deprecated Quill v1

- **Severity:** Low (package is unused)
- **Location:** `package.json` (react-quill @ 2.0.0)
- **Description:** `react-quill` is in `dependencies` but never imported. It depends on Quill v1 which has known XSS vulnerabilities. The package itself is no longer maintained.
- **Impact:** None currently (unused), but would become an issue if adopted.
- **Recommendation:** Remove via `npm uninstall react-quill`. If rich text editing is needed later, use `@tiptap/react` or `lexical`.

### D2. `@stripe/stripe-js` and `@stripe/react-stripe-js` Present but Unused

- **Severity:** Low
- **Location:** `package.json` (stripe packages)
- **Description:** Stripe SDK packages are installed but have zero imports in the codebase. These packages have side effects and may contribute to bundle size even without explicit imports.
- **Impact:** Potential bundle pollution. Confusing signal about payment capabilities that do not exist.
- **Recommendation:** Remove both Stripe packages. Re-add when payment processing is actually implemented.

## Test Coverage Gaps

### T1. Near-Zero Unit Test Coverage

- **Severity:** High
- **Location:** `tests/landlord-login.spec.js` (1 Playwright E2E test), no other test files exist
- **Description:** The entire codebase has exactly one test file: a Playwright E2E test for the landlord magic link login flow. Zero unit tests exist for: service layer functions, utility functions, React components, custom hooks, or business logic (category labels, date calculations, stat computations). No test framework (Vitest/Jest) is configured for unit tests.
- **Impact:** All changes are manually verified. Regressions go undetected. The large inline calculations in `LandlordDashboard.jsx` and `Accounting.jsx` have zero automated verification. Refactoring (e.g., extracting hooks from oversized components) is high-risk without tests.
- **Recommendation:** Add Vitest (compatible with Vite). Priority test targets: (1) service layer CRUD operations with mocked Supabase, (2) utility functions in `src/utils/`, (3) `AuthContext` auth flow, (4) derived calculations from dashboard pages.

### T2. No Error Boundary -- Unhandled Errors Crash the Entire App

- **Severity:** High
- **Location:** `src/App.jsx`, `src/main.jsx`
- **Description:** No `ErrorBoundary` component wraps the application or any sub-tree. Any unhandled JavaScript error during component render crashes the entire app with a white screen and no recovery path. React.StrictMode is also not enabled.
- **Impact:** Poor resilience. A single rendering error in any component (e.g., null access on unexpected API data shape) takes down the entire application for the user.
- **Recommendation:** Add a root `<ErrorBoundary>` component wrapping `<AuthenticatedApp>` in `src/App.jsx`. Show a recovery UI with "Reload" button. Enable `<React.StrictMode>` in `src/main.jsx` to catch side-effect bugs during development.

### T3. No `onError` Handlers on Any Mutation -- Silent Failures

- **Severity:** High
- **Location:** Every `useMutation` call in `src/pages/Accounting.jsx` (12 mutations), `src/pages/Community.jsx`, `src/pages/Register.jsx`, `src/pages/MyCard.jsx`, `src/pages/Recommendations.jsx`, `src/pages/LandlordRequests.jsx`, `src/pages/Directory.jsx`
- **Description:** Not a single `useMutation` call in the codebase includes an `onError` callback. Failed mutations are silently swallowed by React Query's default behavior. Users receive zero feedback when operations fail.
- **Impact:** Users believe operations succeeded when they failed. Particularly dangerous for financial operations in `Accounting.jsx` where 12 mutations (create/update/delete for leases, invoices, expenses, recurring payments) silently fail.
- **Recommendation:** Add `onError` callbacks with toast notifications across all mutations. Consider adding a global `defaultOptions.mutations.onError` handler on the `QueryClient` in `src/lib/query-client.js` as a safety net.

## Technical Debt Inventory

| Item | Severity | Effort | Location |
|------|----------|--------|----------|
| Posts/recommendations/notifications INSERT RLS too permissive | Critical | Medium | `supabase/migrations/001_initial_schema.sql` |
| Units table RLS fully permissive for writes | High | Low | `supabase/migrations/002_units_table.sql` |
| Zero input validation in service layer | High | Medium | All `src/services/*.js` |
| AuditPage query not scoped by property | High | Medium | `src/pages/AuditPage.jsx` |
| No error boundaries | High | Low | `src/App.jsx`, `src/main.jsx` |
| No onError handlers on any mutation | High | Low | All pages with useMutation |
| No pagination on any query | High | Medium | All `src/services/*.js` |
| Near-zero test coverage | High | High | Entire codebase |
| Accounting.jsx 724 lines / 12 mutations inline | High | Medium | `src/pages/Accounting.jsx` |
| Duplicated currentUser queries (5 files) | Medium | Low | Community, Register, MyCard, Recommendations, NotificationBell |
| getCategoryLabel duplicated in 6+ files | Medium | Low | Multiple pages and components |
| window.location.search instead of useSearchParams | Medium | Low | 7 tenant page components |
| Client-side notification fan-out | Medium | Medium | Community.jsx, Recommendations.jsx |
| Storage upload no size/type validation | Medium | Low | `src/services/storage.js` |
| moment library for one usage | Medium | Low | `src/components/NotificationBell.jsx` |
| Two toast systems + one unused | Low | Low | `package.json`, `src/App.jsx` |
| 14+ unused npm dependencies | Low | Low | `package.json` |
| JSON.parse without try-catch | Low | Low | `src/components/LandlordNotificationBell.jsx` |
| Inline UnitLogo markup in 6+ pages | Low | Low | Community, Directory, Recommendations, MyCard, BrowseProperties |
| React.StrictMode not enabled | Low | Low | `src/main.jsx` |

## Recommended Priorities

1. **Security hardening (Critical/High):** Tighten RLS policies on posts, recommendations, notifications, and units tables (C1, C2). Add property_id to audit_log and scope queries (C4). These are the most impactful changes for data security.

2. **Error handling and resilience (High):** Add React ErrorBoundary (T2), add `onError` handlers on all mutations with toast feedback (T3), fix JSON.parse crash in LandlordNotificationBell (S3). These prevent silent failures and white-screen crashes.

3. **Input validation (High):** Create Zod schemas for all entities and validate in the service layer before Supabase calls (C3). Add file upload size/type validation (S1). These protect data integrity.

4. **Code quality refactoring (Medium):** Extract hooks and sub-components from oversized pages (M1). Centralize category labels (M2). Replace duplicated currentUser queries with useAuth (M4). Replace window.location.search with useSearchParams (M5). These reduce maintenance burden and bug risk.

5. **Performance (Medium):** Add pagination to high-volume queries (P1). Remove moment, standardize on date-fns (P2). Remove 14+ unused dependencies (P3). These improve load times and reduce bundle size.

6. **Testing infrastructure (High effort):** Configure Vitest and begin unit test coverage (T1). Priority targets: service layer, utility functions, auth flow, derived calculations. Enables safe refactoring of items in priority 4.

---

*Concerns audit: 2026-03-27*
