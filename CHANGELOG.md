# UNIT Mobile App — Changelog

## 2026-04-14

### Fixed
- **White screen on launch** — macOS file-collision during Apr 12 folder consolidation renamed two Expo Router files with `" 2"` suffixes: `(tabs)/_layout 2.tsx` and `(admin)/index 2.tsx`. Originals were deleted. Expo Router couldn't resolve routes → blank screen for both tenant and admin login. Restored by renaming " 2" files to canonical names (byte-identical to git HEAD). Neither `tsc` nor Metro caught this — only manifests at Expo Router runtime route resolution.
- **Font loading blank flash** — When fonts haven't loaded yet, `app/_layout.tsx` returned `null`, causing a blank frame. Now returns `<LoadingScreen message="Starting..." />` instead.
- **Phantom " 2" duplicate files deleted** — macOS iCloud/collision created 8 phantom untracked duplicates (`Button 2.tsx`, `Input 2.tsx`, `LoadingScreen 2.tsx`, `eas 2.json`, `lib/sentry 2.ts`, `package-lock 2.json`, `tailwind.config 2.js`, `logo-transparent-light 2.png`). All deleted — confirmed empty/duplicate, never committed.

### Added
- **`hooks/useAdminRecentActivity.ts`** — React Query hook surfacing recent admin activity for the dashboard.
- **`lib/sentry.ts`** — Sentry SDK scaffolding for error monitoring (init, breadcrumbs, user context).
- **Supabase migrations** — `20260413000001_fix_profiles_authenticated_grant.sql`, `20260413000002_grant_authenticated_table_access.sql` — grant authenticated role access to profiles and related tables.

### Changed
- **`app/(admin)/index.tsx`** — Admin dashboard refactored: recent activity widget wired to `useAdminRecentActivity`, layout tightened.
- **`app/(admin)/advertisers.tsx`**, **`app/(admin)/tenants.tsx`** — Minor UI polish and type fixes.
- **`services/admin.ts`** — Extended with recent activity query and supporting types.
- **`app.json`** — Minor config update.

## [Unreleased] — 2026-04-13

### Fixed
- **Admin onboarding loop** — Landlords (who have no business profile) were always computing `needsOnboarding=true` because the businesses query returned zero rows. Added short-circuit in `AuthContext.fetchProfile`: when `role === 'landlord'`, skip the business lookup and set `needsOnboarding(false)` immediately.
- **Post-onboarding navigation race condition** — Calling `router.replace('/(tabs)/directory')` after `refreshProfile()` caused a redirect loop because React state committed asynchronously. Removed `router.replace` entirely; AuthGuard now handles navigation when `needsOnboarding` flips false.
- **Login screen logo invisible in dark mode** — `logo-transparent-light.png` (white icon) was invisible against the `brand-navy` background. Replaced with `unit-logo-transparent.png` inside a white rounded card container.
- **Onboarding search bar double-border** — Nested `Input` component inside a styled container created a box-in-box visual. Replaced with a bare `TextInput` inside a manually styled row.
- **Onboarding sign-out button pushed off screen** — `SignOutLink` placed after a `flex-1` FlatList was clipped. Moved into `ListFooterComponent` so it scrolls with the list.
- **`activeOpacity` TS error on `Pressable`** — `activeOpacity` is a `TouchableOpacity` prop; it is not valid on `Pressable`. Removed all instances.
- **Safe area spacing on onboarding** — Fixed `pt-16` hardcoded padding to `useSafeAreaInsets().top + 16` so Dynamic Island / notch devices are handled correctly.
- **Admin/tenant profile cross-contamination** — Tenant `(tabs)/profile.tsx` and landlord `(admin)/profile.tsx` now both have bidirectional role guards (`Redirect` to the correct route group if the wrong role reaches the screen). The Profile tab is hidden in the tab bar for admin users.

### Added
- **Occupied unit gate** — `businessesService.getOccupiedUnits(propertyId)` returns a `Set<string>` of claimed unit numbers. During onboarding step `'unit'`, claimed units are shown with reduced opacity and a "Claimed" badge; selecting one shows an alert instead of advancing.
- **Logout on all onboarding steps** — A `SignOutLink` component (defined outside the screen component for stable type identity) appears in the `ListFooterComponent` of every FlatList step (property, unit) and at the bottom of the profile form step.
- **Back navigation in onboarding** — "Back to properties" and "Back to units" pressables are included in the unit and profile steps respectively.
- **Admin profile screen** (`app/(admin)/profile.tsx`) — Dedicated account screen for landlords showing email, role, app version, and push notification toggle. Linked from the admin dashboard via "Account Settings".
- **`refreshProfile` in AuthContext** — New method exposed on `AuthState` that re-fetches the current user's profile without triggering a full sign-out/sign-in cycle.

### Changed
- `(admin)/_layout.tsx` — Added `profile` screen to the Stack so the new admin profile route is registered.
- `(tabs)/_layout.tsx` — Renamed from `_layout 2.tsx` (Expo Router requires exact filename). Removed dead admin tab stub.
- `(auth)/onboarding.tsx` — `SignOutLink` is now a named function defined outside the screen component (stable across re-renders); uses `onSignOut` prop pattern.
