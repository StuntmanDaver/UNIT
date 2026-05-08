# UNIT Mobile App — Changelog

## 2026-05-08 — Login and launch logo visibility

### Fixed
- **Login logo visibility** — Replaced the oversized transparent login artwork with a tightened light UNIT lockup asset and exposed a stable `login-logo` test ID for simulator checks.
- **Loading/splash logo treatment** — Swapped the dark launch logo treatment for the light UNIT lockup on a light brand background in both Expo config and generated iOS splash resources.
- **Login test shortcuts** — Removed the `Admin`, `Tenant 1`, and `Tenant 2` quick-fill buttons from the App Review login screen.

### Verification
- `npm run typecheck`
- iPhone 16 Pro Max simulator login screenshot confirms the UNIT lockup is visible on the login screen.
- iPhone 16 Pro Max simulator login screenshot confirms the dev account shortcuts are no longer visible.

## 2026-05-08 — Apple App Review account deletion compliance

### Added
- **In-app account deletion flow** — Tenant Profile and Admin Account now expose a `Delete Account` action with an in-app destructive confirmation modal. The flow invokes a trusted Supabase Edge Function, signs the local session out, and returns the user to login after deletion.
- **`services/account.ts`** — New account service wraps the `delete-account` Edge Function and surfaces invocation/function errors to the UI.
- **`supabase/functions/delete-account`** — New Edge Function verifies the caller via JWT, uses the service role only server-side, cleans account-owned rows/assets where discoverable, clears admin reference fields that would block auth deletion, and deletes the Supabase Auth user.
- **Account deletion migration** — `20260508000001_account_deletion_support.sql` updates blocking foreign keys so admin review/refund references and analytics rows do not prevent account deletion.
- **Account service tests** — Focused Jest coverage for successful invocation and error propagation.

### Verification
- `npm run typecheck`
- `npm test` — 16 suites, 72 tests
- `npm run brand-lint`
- `git diff --check` on touched files

## 2026-05-06 — Maestro E2E stabilization (qa-directory-01 green end-to-end)

`qa-directory-01-search-states.yaml` now passes from launch through logout. Twelve commits land on `ralph/engagement-ui-enhancement`. The session uncovered a real product routing bug (directory back navigation) and codified three reusable Maestro patterns for the remaining qa-* flows.

### Fixed (real product bugs)
- **Directory back-button escaped the tab** (`44fd9c0`) — `app/(tabs)/directory/[id].tsx`. The detail screen lives outside the directory tab's stack (no `_layout.tsx` under `app/(tabs)/directory/`), so `router.back()` popped the global navigation history and dumped the user on the **Home tab** instead of the directory list. A real user pressing Back hit the same broken UX. Now `router.replace('/directory')` always returns to the list within its own tab. Long-term fix is a directory stack layout — deferred.
- **Logout alert confirm tap was coordinate-based** (`da0378c`) — `maestro/subflows/logout.yaml` and `maestro/flows/qa-04-full-sweep.yaml` previously tapped `point: "65%,56%"` to confirm the iOS Alert. Replaced with `tapOn: text: "Log Out", index: 1` (the profile-page Log Out button occupies index 0 even behind the modal). Unblocks every flow that ends in logout (~8 flows).

### Added (testIDs for stable Maestro selectors)
- `category-chips-list` (`6810dda`) on `<FlatList>` in `components/ui/CategoryChips.tsx` — anchors horizontal swipe gestures.
- `onboarding-category-scroll` (`6810dda`) on `<ScrollView>` in `app/(auth)/onboarding.tsx` — same role for the onboarding form.
- `business-card` (`bc23545`) on `BusinessCard` (via new `testID` prop on `Card`) — replaces fragile `childOf: text: "Directory"` that was actually matching the screen heading, not the FlatList.
- `back-btn` (`0e15d23`) on the directory detail back button — replaces unreliable Maestro `back` action.
- 4 pending advertiser promotion rows in `unit/scripts/seed-e2e-test-data.sql` (`8efaa69`) — required by `qa-admin-05-promo-review-all-actions.yaml`. Also fixed verification queries that referenced a non-existent `kind` column.

### Maestro patterns established (for the remaining qa-* flows)
- **Horizontal scroll on RN FlatList** — `scrollUntilVisible` does not reliably target horizontal lists; it picks the page-level container. Use bounded `repeat times: N` containing `runFlow when: notVisible` + `swipe from: id: <testID> direction: LEFT duration: 600`. Pattern in `qa-directory-01`, `m2-02-directory`, `m1-05-onboarding`.
- **Stack back navigation** — Maestro's `back` action on iOS simulator silently no-ops (no hardware back button; edge-swipe gestures unreliable). Use explicit `tapOn: id: "back-btn"` on the in-page back affordance.
- **Don't `assertNotVisible` on tab-bar text** — bottom tab labels (Home, Directory, Promotions, Community, Alerts, Profile) are always rendered. Asserting their text is invisible after navigation races the tab bar against the assertion. Use a screen-specific testID instead.

### Removed
- `tapOn: point: "65%,56%"` coordinate taps in two locations.
- `scrollUntilVisible direction: RIGHT` for category chips in three flows.
- Redundant `assertVisible: "Test"` after `inputText: "Test"` in two flows (`f9aced7`) — iOS TextInput values are not exposed as Text nodes in the accessibility tree.
- The non-existent `"Services"` category chip target (`fae3bf5`) — `BUSINESS_CATEGORIES` has no such entry.

### Infrastructure
- `STRIPE_SECRET_KEY` confirmed present in Supabase Edge Function secrets for project `ouvneoaqoilnigynlvbp` (digest `5c1103…c3ca7`). No change needed.

### Notes
- ~9 other qa-* flows still need the same dev-build handler + testID/swipe/back-btn pattern applied (`qa-community-01`, `qa-promotions-01`, `qa-profile-01`, `qa-alerts-01`, `qa-admin-01..05..07`). qa-04-full-sweep already passes end-to-end (the inline logout was fixed in `da0378c`).
- The single ⚪️ skipped step in passing runs is a conditional `runFlow when: visible: "Would Like to Send You Notifications"` — iOS only shows the prompt once per simulator install. Skipping is correct behavior.

## 2026-04-20 — Phases 02→05 marathon (milestone code-complete)

All five milestone phases shipped code-complete in a single session. Five commits land on `main`; full Jest suite passes 52/52; brand-lint clean; tsc clean; production iOS bundle exports cleanly with zero warnings.

### Added
- **Cross-platform `CSVImporter`** (`b524a34`) — `components/admin/CSVImporter.tsx` + new `_csvImporter.utils.ts` using `expo-document-picker ~14.0.8` + `expo-file-system ~19.0.21` File API + `papaparse ^5.5.3` + `@types/papaparse`. Replaces the web-only `HTMLInputElement` + `FileReader` + `<input type="file">` importer. Removed the `Platform.OS === 'web'` gate in `app/(admin)/tenants.tsx:219`. Mobile admins can finally bulk-invite tenants. Closes **BUG-02** (importer unreachable on mobile), **BUG-09** (quoted-comma parsing — `"Consulting, LLC"` no longer splits across columns), **BUG-10** (progress bar clamped ≤100%), **BUG-11** (per-row errors propagate from Edge Function response into UI).
- **Unit tests for CSV parse/validate** (`b524a34`) — `components/admin/__tests__/CSVImporter.test.tsx`. 18 tests covering quoted commas, invalid rows, progress clamp, unit_number paths.
- **Non-blocking logo-upload toast in onboarding** (`c536fe4`) — `app/(auth)/onboarding.tsx:140-158`. Wraps storage upload in its own try/catch; failure surfaces a non-blocking info toast while profile creation still completes. Per D-05 / Risk Area 5.
- **Sentry initialized at app boot** (`b44b838`) — `app/_layout.tsx` now calls `initSentry()` at module load before `SplashScreen.preventAutoHideAsync()`. Scaffolding was present since Apr 14 but never wired in. Closes **DEP-05**. `initSentry()` guards Expo Go via `isRunningInExpoGo()` so dev is safe.
- **Non-blocking logo-upload toast in profile/edit** (`23c17ec`) — `app/(tabs)/profile/edit.tsx:99-110`. Mirrors the Phase 02 onboarding pattern — logo upload failure shows info toast, profile save still persists other fields. Closes **M2-01** code gap.
- **UUID format check on EAS projectId** (`5ec601f`) — `hooks/usePushNotifications.ts`. New regex guard catches the literal `"YOUR_EAS_PROJECT_ID"` placeholder in `app.json` with a dev-only warning pointing to `eas init`. Without this, `Notifications.getExpoPushTokenAsync` returned a silent `Invalid uuid` from `exp.host`.
- **Explicit `broadcast` case in deep-link router** (`5ec601f`) — `handleNotificationResponse` now has an explicit branch for `type: 'broadcast'` → `/(tabs)/notifications`. Functionally identical to the prior default fall-through, but self-documenting.
- **Deep-link router unit tests** (`5ec601f`) — `__tests__/hooks/usePushNotifications.test.ts`. 7 tests covering all 5 push types (`post`, `offer`, `promotion`, `advertiser_approved`, `broadcast`) + unknown + no-type. `handleNotificationResponse` exported for testability.

### BUG-08 — `invite-tenant` Edge Function
- `supabase/functions/invite-tenant/index.ts` now persists `unit_number` on the created `businesses` row when the CSV row supplies it. Duplicate `unit_number` per property is rejected (T-02-11). Tenants created without a `unit_number` are marked for unit-claim on first login.

### Fixed
- **Push token registration silent failure** — `hooks/usePushNotifications.ts` previously accepted the `"YOUR_EAS_PROJECT_ID"` placeholder as a truthy projectId and posted it to `exp.host/--/api/v2/push/getExpoPushToken`, which returned HTTP 400 `Invalid uuid` with no surfaced error. Now the UUID regex guard bails out early with a helpful dev warning.

### Infrastructure
- Supabase Edge Functions redeployed to project `ouvneoaqoilnigynlvbp` (UNIT Shane): `invite-tenant` + `complete-onboarding`.

### Notes
- Remaining sign-off work is human-interactive: ~2-2.5h user UAT session (iOS simulator + Vercel dashboard fix for KNOWN-BUG-06 + `eas init` + dev build for NOTIF push).
- No portal code changes this session; portal `vitest run` stays green at 3/3.

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
