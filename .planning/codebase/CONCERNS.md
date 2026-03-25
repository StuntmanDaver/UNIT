# Codebase Concerns

**Analysis Date:** 2026-03-25

## Tech Debt

**Large, Monolithic Page Components:**
- Issue: Multiple pages exceed 400+ lines of code with all business logic, state management, and UI in single components
- Files: `src/pages/Accounting.jsx` (496 lines), `src/pages/MyCard.jsx` (439 lines), `src/pages/Register.jsx` (405 lines), `src/pages/Directory.jsx` (341 lines), `src/pages/BrowseProperties.jsx` (339 lines)
- Impact: Difficult to test, maintain, and reuse logic. Complex components become fragile when requirements change. Adding features requires understanding entire file.
- Fix approach: Extract modal/form logic into separate components. Move query/mutation logic to custom hooks. Break UI into smaller, focused sub-components. Create a hooks directory for data-fetching logic (e.g., `useAccountingData`, `useLeaseManagement`).

**Missing Query Key Standardization:**
- Issue: Query keys are inconsistently structured across components - some use tuples like `['leases']`, others use `['leases', propertyId]`. When invalidating queries with partial keys, may fail to clear related cache.
- Files: `src/pages/Accounting.jsx`, `src/pages/Directory.jsx`, `src/pages/MyCard.jsx`, `src/components/NotificationBell.jsx`, `src/components/AdPopup.jsx`
- Impact: Stale data issues. Mutations don't properly invalidate related caches. Users see outdated information after creating/updating entities.
- Fix approach: Create `queryKeys.js` factory object with consistent naming (e.g., `queryKeys.leases.all()`, `queryKeys.leases.byProperty(id)`, `queryKeys.leases.byBusiness(id)`). Use these factories everywhere. Update invalidation to use full key arrays.

**Unvalidated URL Parameters:**
- Issue: Pages extract URL parameters directly without validation: `const propertyId = urlParams.get('propertyId')` then use immediately in queries
- Files: `src/pages/Accounting.jsx` (line 30), `src/pages/Directory.jsx` (line 34), `src/pages/MyCard.jsx` (line 35), `src/pages/Register.jsx` (line 19), `src/pages/BrowseProperties.jsx`, `src/pages/LandlordRequests.jsx`
- Impact: Invalid IDs cause silent failures. Queries with invalid IDs execute anyway. No user feedback. Could expose unintended data if ID validation isn't done server-side.
- Fix approach: Create validation utility function `validateEntityId()`. Add error state to pages. Show error UI when URL params are invalid. Add QueryFn guards that return early if params are invalid.

**No Error Boundaries or Global Error Handling:**
- Issue: Only 5 console.log/error statements in entire codebase. Most API errors are caught but not displayed to users. Failed queries show loading state indefinitely.
- Files: `src/lib/AuthContext.jsx` (minimal error handling), `src/pages/Register.jsx`, `src/components/QRCodeCard.jsx`, `src/lib/PageNotFound.jsx`
- Impact: Users don't know when operations fail. Network errors silently fail. Could appear to users like the app is broken or stuck.
- Fix approach: Add error display to every major query/mutation. Create global error handler middleware in Query Client. Add React Error Boundary component at app root. Display user-friendly error toasts on mutation failures.

## Known Bugs

**Loose JSON.parse Without Try-Catch:**
- Symptoms: App crashes if localStorage contains corrupted JSON data
- Files: `src/components/LandlordNotificationBell.jsx` (line with `JSON.parse(stored)`)
- Trigger: User manually edits localStorage or browser has corrupted data from previous session
- Workaround: Clear browser storage and reload page
- Fix: Wrap `JSON.parse()` in try-catch, provide fallback empty array/object

**Session Storage for Landlord Auth Not Cleared:**
- Symptoms: User can access landlord dashboard for previous property after logout
- Files: `src/pages/LandlordLogin.jsx` (line 36: `sessionStorage.setItem('landlord_property_id', ...)`)
- Trigger: Log in as landlord for Property A, then close app without logging out. `sessionStorage` persists across page reloads in same tab.
- Workaround: Manually clear session storage or use private browsing
- Fix: Clear `sessionStorage` on logout. Add explicit logout handler in AuthContext.

**No Validation on Amount/Currency Fields:**
- Symptoms: Users can submit negative amounts, zero amounts, or non-numeric input in financial forms
- Files: `src/components/accounting/InvoiceModal.jsx`, `src/components/accounting/LeaseModal.jsx`, `src/components/accounting/RecurringPaymentModal.jsx`, `src/components/accounting/ExpenseModal.jsx`
- Trigger: User enters `-100` in amount field and submits
- Workaround: None - will be sent to API
- Fix: Add HTML5 `type="number" min="0.01" step="0.01"` to amount inputs. Add client-side validation in mutation onSubmit.

**Floor Map Position Defaults Are Unsafe:**
- Symptoms: Businesses render at same position or default positions when floor_position_x/y are missing
- Files: `src/components/FloorMapView.jsx` (lines 49-50: fallback position calculation)
- Trigger: Business entity missing floor position data
- Workaround: Edit business to set floor position
- Fix: Show warning in UI when position data missing. Distribute businesses across grid systematically instead of hardcoded defaults.

## Security Considerations

**Direct Access Token Storage in localStorage:**
- Risk: Access token stored in plain localStorage, exposed to XSS attacks. No HttpOnly cookie option.
- Files: `src/lib/app-params.js` (lines 13, 23-24 storing token in storage)
- Current mitigation: Token comes from URL parameter only on initial load
- Recommendations: Move to HttpOnly secure cookies if backend supports. Implement token refresh mechanism with rotation. Add Content Security Policy header to prevent XSS. Consider using memory-only storage for tokens.

**Landlord Code Transmitted as Query Parameter:**
- Risk: Access code visible in URL history and browser history. Transmitted unencrypted if not HTTPS.
- Files: Not stored in code, but results from login flow
- Current mitigation: Access code is not logged
- Recommendations: Enforce HTTPS everywhere. Use POST request for code submission instead of URL params. Consider short-lived access codes with expiration.

**No CSRF Protection Visible:**
- Risk: Mutations don't show evidence of CSRF token validation
- Files: All mutation calls in `src/pages/` and `src/components/accounting/`
- Current mitigation: Likely handled by backend SDK (@base44/sdk)
- Recommendations: Verify SDK enforces CSRF tokens. Add explicit CSRF header validation if framework supports it.

**User Email Exposed in Query Keys:**
- Risk: Query keys include user email (e.g., `['myBusiness', user?.email]`), visible in network tab and query cache logging
- Files: `src/pages/MyCard.jsx` (line with `['myBusiness', businessIdFromUrl, user?.email]`), `src/pages/Recommendations.jsx` (same pattern)
- Current mitigation: None
- Recommendations: Replace email with user ID in query keys. Use ID-based lookups throughout.

## Performance Bottlenecks

**Multiple Identical Data Fetches on Page Load:**
- Problem: Pages fetch `currentUser`, `property`, and multiple entity lists on mount. No query deduplication.
- Files: `src/pages/Accounting.jsx` (7 separate queries for one property's data), `src/pages/MyCard.jsx`, `src/pages/Directory.jsx`
- Cause: Each component independently queries same data without shared parent-level queries
- Improvement path: Create higher-order component or layout wrapper that fetches property + user data once. Pass via context. Only fetch entity-specific data in child components. Use query factory to ensure same keys = same cache.

**No Pagination on List Entities:**
- Problem: `base44.entities.X.filter()` and `.list()` calls fetch all records. No limit/offset support visible.
- Files: `src/pages/BrowseProperties.jsx` (line 22: `Property.list()`), `src/pages/Directory.jsx` (line 54: `Business.filter()`), all accounting entity queries
- Cause: SDK may not support pagination, or pagination wasn't implemented
- Improvement path: If SDK supports pagination, add limit/offset params. Implement infinite scroll or pagination UI. Cache page results separately with proper key structure.

**Inefficient Re-renders on State Changes:**
- Problem: Modal open/close state changes trigger re-render of entire page. No React.memo on child components.
- Files: `src/pages/Accounting.jsx` (8 modal state variables), `src/pages/MyCard.jsx` (modal state)
- Cause: Modal state is in page component, entire page re-renders on toggle
- Improvement path: Extract modals to custom hook or separate context. Use React.memo on modal components. Memoize callback functions with useCallback.

**Inefficient Lease Expiry Calculation:**
- Problem: `expiringLeases` filtering runs on every render, does date math for every lease
- Files: `src/pages/Accounting.jsx` (lines 149-155)
- Cause: Lease filtering not memoized
- Improvement path: Wrap in `useMemo` hook. Pre-calculate in data fetching layer if possible.

## Fragile Areas

**Authentication State Checking:**
- Files: `src/lib/AuthContext.jsx`
- Why fragile: Multiple sequential try-catch blocks with overlapping error handling. App-level check and user-level check are separate, creating window for state inconsistency. `checkUserAuth` called from `checkAppState` catch block could mask errors.
- Safe modification: Add comprehensive error logging. Consider consolidating checks into single function. Add timeout handling for hanging requests. Test all error paths (network failure, auth required, user not registered, token invalid).
- Test coverage: Likely incomplete - error scenarios not tested

**Business/Lease/Invoice Relationships:**
- Files: `src/components/accounting/` modal files, `src/pages/Accounting.jsx`
- Why fragile: Filter operations assume data relationships exist (e.g., `leases.filter(l => l.business_id === ...)` assumes lease has business_id). No null checks. If business deleted, invoice/lease references break.
- Safe modification: Add defensive null checks before rendering. Show warnings when relationships missing. Validate relationship existence before allowing operations.
- Test coverage: No tests found

**Form Data Persistence Across Modals:**
- Files: All modal files in `src/components/accounting/`
- Why fragile: Modal state resets on close, but if form submission fails, user loses data. No draft/auto-save. Copy-paste logic in every modal (generateInvoiceNumber, date formatting).
- Safe modification: Extract form logic to custom hook. Implement form auto-save to localStorage. Add confirmation dialog before closing unsaved forms.
- Test coverage: No tests

**Floor Position Data Handling:**
- Files: `src/components/FloorMapView.jsx`, anywhere business position is saved
- Why fragile: Fallback position calculation uses index-based positioning. If businesses added/removed, positions shift. No validation that x/y are valid percentages (0-100).
- Safe modification: Validate position values. Store absolute positions, not relative. Add position collision detection. Require explicit position setting in UI rather than auto-layout.
- Test coverage: No tests

## Scaling Limits

**No Pagination on Large Property Lists:**
- Current capacity: App loads all properties at once. No visible limit tested.
- Limit: Likely fails with 1000+ properties. Browser memory/render performance issues.
- Scaling path: Implement pagination (10-20 per page). Add search/filter before loading all. Virtualize list rendering if implementing infinite scroll.

**Real-time Notifications Not Implemented:**
- Current capacity: Notifications fetch on page load, no refresh. Uses polling if at all.
- Limit: Cannot scale to real-time delivery across multiple users. Notifications delayed.
- Scaling path: Consider WebSocket for live updates. Implement notification center with subscription model. Add background sync capability.

**No Database Query Optimization Visible:**
- Current capacity: Each entity query independent. Likely creating N+1 queries (fetch property, fetch all businesses, fetch info for each business separately).
- Limit: Will become slow with hundreds of businesses per property.
- Scaling path: Add GraphQL or query composition to fetch related entities. Implement server-side query optimization.

## Dependencies at Risk

**@base44/sdk (Custom, Proprietary Backend):**
- Risk: Single-vendor dependency. SDK behavior opaque. Version lock at ^0.8.3 could miss important updates.
- Impact: If SDK breaks or is deprecated, entire app depends on specific version.
- Migration plan: Audit SDK API usage. Document all SDK method calls. Create abstraction layer (`src/api/base44Adapter.js`) that wraps SDK calls, making it easier to replace later.

**Large Radix UI Dependency Tree:**
- Risk: 20+ @radix-ui packages imported individually. Could have security vulnerabilities in one sub-package.
- Impact: Complex dependency tree to audit. Any vulnerability in radix ecosystem requires version bump across all.
- Migration plan: Keep updated with security patches. Consider alternative UI library in future if maintenance burden grows.

**Unspecified React Version Potential:**
- Risk: react@^18.2.0 allows 18.3.x or future 19.x. Concurrent features might break assumptions.
- Impact: Major version bump could change behavior subtly.
- Migration plan: Pin React version when confident in compatibility. Monitor React changelogs.

## Missing Critical Features

**No Offline Support:**
- Problem: App requires constant internet connection. No data caching for offline use.
- Blocks: Users can't view/edit data on unreliable connections. Mobile users on cellular can't use app.
- How to add: Implement service worker for offline caching. Use SQL.js for offline database. Implement sync queue for mutations done offline.

**No Audit Trail / Change History:**
- Problem: No record of who changed what. Can't see previous lease terms or invoice amounts.
- Blocks: Landlords can't investigate disputes. No accountability for modifications.
- How to add: Implement audit log entity. Store created_at/updated_at/created_by/updated_by on all records. Show history UI in accounting pages.

**No Backup/Export Functionality:**
- Problem: All data lives in base44 backend. No way to export financial records.
- Blocks: Can't backup data locally. Can't generate reports in other formats (CSV, Excel).
- How to add: Add export buttons in Financial Reports. Implement CSV/PDF export using jspdf and html2canvas already included.

**No Role-Based Access Control (RBAC):**
- Problem: All authenticated users can access all properties (if they know propertyId). No permission checking.
- Blocks: Can't restrict users to specific properties. Can't have read-only vs admin roles.
- How to add: Add role field to users. Check role/permissions in query guards. Implement property-user association. Gate features behind role checks.

## Test Coverage Gaps

**Zero Unit/Integration Tests:**
- What's not tested: All React components, all hooks, all mutations, all error paths
- Files: Entire `src/` directory - 0 test files found
- Risk: Regressions undetected. Refactoring breaks functionality silently. New features break existing ones.
- Priority: **High** - Start with tests for authentication, accounting operations, and form validation

**No Integration Tests for Query Cache:**
- What's not tested: Query invalidation behavior, cache hits/misses, parallel query deduplication
- Files: All pages and components using useQuery
- Risk: Changes to query keys silently break cache behavior. Mutations don't properly refresh UI.
- Priority: **High** - Add integration tests for accounting page data flow

**No E2E Tests for Critical Flows:**
- What's not tested: Full accounting workflow (create lease → create invoice → view reports), landlord login flow, business registration
- Risk: Major user flows break undetected. Deployment could completely break core functionality.
- Priority: **High** - Add E2E tests for landlord login, business registration, and accounting operations

**No Error Scenario Testing:**
- What's not tested: Network failures, invalid user input, missing relationships, permission errors
- Risk: Errors may crash app instead of showing friendly messages
- Priority: **Medium** - Add error boundary tests, mutation error handling tests

---

*Concerns audit: 2026-03-25*
