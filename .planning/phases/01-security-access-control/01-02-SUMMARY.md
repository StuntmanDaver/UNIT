---
phase: 01-security-access-control
plan: 02
subsystem: auth-routing
tags: [landlord-guard, route-protection, property-context, magic-link, supabase]
dependency_graph:
  requires: [01-01]
  provides: [landlord-route-protection, property-context, magic-link-login]
  affects: [src/App.jsx, src/pages/LandlordLogin.jsx]
tech_stack:
  added: []
  patterns: [React Router Outlet pattern for route guards, localStorage persistence for active property, TanStack Query invalidation on property switch]
key_files:
  created:
    - src/components/guards/LandlordGuard.jsx
    - src/lib/PropertyContext.jsx
  modified:
    - src/App.jsx
    - src/pages/LandlordLogin.jsx
decisions:
  - LandlordLogin route stays in general pages map (not guarded) — it is the auth entry point, not a protected destination
  - PropertyProvider wraps each landlord route element individually so useProperty() is available in all three landlord pages
  - LANDLORD_PAGES constant defined inside AuthenticatedApp (not module-level) to keep it co-located with the routing logic
metrics:
  duration: "97 seconds"
  completed: "2026-03-26T05:11:00Z"
  tasks_completed: 3
  files_changed: 4
---

# Phase 01 Plan 02: Route Protection and Magic Link Login Summary

**One-liner:** React Router Outlet-based LandlordGuard blocking non-landlords from financial routes, with Supabase signInWithOtp replacing sessionStorage code login.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create LandlordGuard and PropertyContext | b7daaed | src/components/guards/LandlordGuard.jsx, src/lib/PropertyContext.jsx |
| 2 | Modify App.jsx routing | c02be65 | src/App.jsx |
| 3 | Rewrite LandlordLogin magic link | 2cc454f | src/pages/LandlordLogin.jsx |

## What Was Built

**LandlordGuard (`src/components/guards/LandlordGuard.jsx`):** Route guard component using React Router's `Outlet` pattern. Checks `isLoadingAuth`, `user`, and `isLandlord` from `useAuth()`. Shows a brand-navy full-screen Loader2 spinner during auth loading. Redirects unauthenticated users to `/LandlordLogin` and authenticated non-landlords to `/Welcome`. Renders `<Outlet />` only when the user has the landlord role.

**PropertyContext (`src/lib/PropertyContext.jsx`):** Context provider that tracks the active property for landlord sessions. Persists `activePropertyId` to `localStorage` under key `active_property_id` with lazy initialization. `switchProperty(propertyId)` updates both localStorage and state, then calls `queryClient.invalidateQueries()` with no arguments to invalidate all cached data atomically. `useProperty()` hook throws if called outside a `PropertyProvider`.

**App.jsx routing changes:** Added `LANDLORD_PAGES = ['LandlordDashboard', 'LandlordRequests', 'Accounting']` constant. The general `Object.entries(Pages).map()` loop now filters out these three pages. A `<Route element={<LandlordGuard />}>` parent registers all three as children, each wrapped in `<PropertyProvider>`. `LandlordLogin` stays in the general map as the unauthenticated entry point.

**LandlordLogin rewrite:** Complete removal of `propertiesService`, `useQuery`, `useNavigate`, `createPageUrl`, `code` state, and all `sessionStorage` references. Replaced with `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })`. On success, shows a confirmation card with `Mail` icon and "Check your email" heading. Error message does not distinguish "no account" from send failure (security). Preserves original brand styling (gradient background, card backdrop blur, framer-motion entry animation).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All three new files wire real data: LandlordGuard reads live auth state, PropertyContext reads/writes real localStorage, LandlordLogin calls the real Supabase OTP endpoint.

## Self-Check: PASSED

All created files confirmed to exist on disk. All task commits (b7daaed, c02be65, 2cc454f) confirmed in git history.
