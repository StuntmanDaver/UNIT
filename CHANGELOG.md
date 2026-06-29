# UNIT Mobile App — Changelog

## 2026-06-29 — Store release readiness and security hardening

### Changed
- Added a Netlify marketing website source under `website/` plus `netlify.toml`,
  deployed live at `https://unit-tenant-app.netlify.app`.
- Added store submission metadata under `fastlane/metadata/` and a
  `release:check-store-assets` gate that validates production app identity,
  icon sizes, privacy manifest, screenshot assets, and App Store / Play Store
  listing text.
- Recorded fresh iOS and Android production store builds in
  `docs/production-readiness-evidence.json`.
- Hardened tenant business search by stripping PostgREST `.or()` metacharacters
  before interpolating user search text.
- Escaped tenant/property strings in the invite-tenant HTML email and stripped
  CR/LF from the subject.
- Added Supabase guards preventing advertisers from self-marking promotions
  paid and scoping advertiser profile / promotion lead visibility by landlord
  property relationship.
- Preserved landlord-created property self-attachment by marking the internal
  trigger update so the profile security guard still blocks direct self-edits.

### Verified
- `npm run release:check`
- `npm run appstore:auth:check`
- `npm run production:readiness:check -- --allow-external-blockers`
- `npm run db:test:security`
- Live Stripe account now reports `charges_enabled=true` and
  `payouts_enabled=true` with business URL
  `https://unit-tenant-app.netlify.app/`.
- Netlify site returns `HTTP 200`, and `/portal` redirects to the live portal.

### Remaining
- Google Play automated submit is still blocked until the first Play Console
  upload is completed manually once for Android build
  `395a00fb-1156-4b3f-a79b-43fb8e6989ac` / versionCode `7`.

## 2026-06-05 — Android production E2E certified green

### Changed
- Hardened the shared admin login Maestro subflow on Android by retrying submit
  when the login screen remains visible after the first tap.
- Hardened the Android E2E runner cleanup path so successful runs stop
  long-running emulator/Maestro child processes and return control to the
  shell.
- Recorded the superseding Android green run in
  `docs/android-e2e-status-2026-06-01.md`.

### Verified
- Full guarded production Android E2E run `e2e_20260605T014149Z_i3rjhx`
  passed: 33 passed, 0 failed.
- Follow-up Android install-gate runner cleanup proof
  `e2e_20260605T035248Z_ft31db` passed and exited with code 0.
- `npm run lint`
- `npm run typecheck`
- `git diff --check`

### Remaining
- Android automated production E2E is green as of this run, but external release
  gates remain separate: live Stripe credentials, production portal host/domain
  evidence, App Store/TestFlight review, Google Play credentials, and production
  account ownership.

## 2026-06-02 — Production blocker hardening pass

### Changed
- Stabilized `AdminPromotionDetailScreen` Jest coverage by mocking toast side
  effects and separating mutation-call assertions from inline feedback
  assertions.
- Stabilized `PropertySelector` so inline parent `onSelect` callbacks do not
  retrigger property refetch loops.
- Added Supabase hardening for tenant promotion property scope, post/business
  property binding, tenant business ownership guards, unique unit claims,
  `public-assets` storage provisioning/policies, and landlord property
  self-attachment.
- Hardened admin push broadcasts by rejecting unsupported caller-supplied
  notification types in the Edge Function.
- Masked Sentry replay images/text in production while keeping source-map
  upload configuration env-driven through existing `sentry.properties` files.
- Replaced module-load Supabase env crashes with a safe startup configuration
  error screen.
- Prevented premature admin redirects while auth is loading and refreshed
  current-user state after property creation/attachment.

### Not changed
- Stripe checkout/webhook behavior remains intentionally out of scope for this
  pass.
- No TestFlight push or submit was performed.

## 2026-06-01 — GitHub push guard recorded

### Changed
- Recorded the permanent mobile repo rule: do not commit or push to
  `JonFine0515/unit.git`.
- `JonFine0515/unit.git` is fetch-only legacy/upstream context.
- Approved mobile push destination is `StuntmanDaver/UNIT.git` through the
  `stuntman` remote, unless the user explicitly names another approved target.
- Local `origin` push should remain disabled with
  `DISABLED_DO_NOT_PUSH_TO_JONFINE0515_UNIT`.

### Context
- An accidental push to `JonFine0515/unit.git` was force-reset back to
  `bc5183737c6ba1c72d5fb99a4e6b65965d13d097` on 2026-06-01 at the user's
  request.
- Future Codex sessions should treat any push to `origin` as a blocker and stop
  before mutating that remote.

## 2026-06-01 — Android production E2E full-suite rerun is red

### Verified
- Installed EAS Android production build `f59c8c9c-9a51-4826-a051-0958a106a0b0`
  on `UNIT_Pixel_8_API_36` as `com.unitapp.mobile`.
- Tested app version `1.0.0`, Android versionCode `6`, package
  `com.unitapp.mobile`.
- Converted the production `.aab` artifact to emulator-installable APKs with
  `bundletool` and a temporary `/tmp` E2E keystore. This verifies production
  build contents, but not Play Store signing.
- Android release inputs were materialized locally before testing:
  `release-inputs-ok: mobile source/assets are materialized`.
- Full Android suite definition `maestro/flows/qa-00-full-suite-android.yaml`
  contains 30 child flows and all referenced flow files exist.

### Result
- Android is **not production-green**.
- Clean passes before the runner/emulator degraded: 16 flows.
- Clean failures before the runner/emulator degraded: 7 flows.
- Remaining admin/deeplink/permission coverage was not certified because
  Android showed repeated ANR dialogs and Maestro's Android driver later failed
  with `Broken pipe`, `UNAVAILABLE`, and `tcp:7001 closed`.

### Passed
- `qa-auth-01-login-validation`
- `qa-auth-02-signup-edge`
- `qa-auth-04-onboarding-edge`
- `qa-auth-05-routing-redirects`
- `qa-home-01-feed-states`
- `qa-directory-01-search-states`
- `qa-business-01-contact-actions`
- `qa-community-01-create-announcement`
- `qa-community-02-create-event`
- `qa-promotions-02-create-cancel-paths`
- `qa-promotions-03-pending-payment-edges`
- `qa-promotion-detail-01`
- `qa-alerts-01-mark-read`
- `qa-profile-01-qr-share`
- `qa-profile-02-push-toggle`
- `qa-admin-01-dashboard-nav`

### Failed / Blocked
- `qa-auth-03-reset-password`: expected `Update Password`, but the screen did
  not appear after login as the reset-password user.
- `qa-home-02-nearby-20-mile-feed`: Nearby feed showed the neighbor
  announcement but not the origin announcement after switching segments.
- `qa-promotions-01-segments-analytics`: Maestro Android driver timed out
  during login text erase.
- `m5-02-tenant-paid-promotion`: paid promotion creation did not reach
  `Pending Payment`, so the Android paid-promotion/Stripe happy path is not
  certified.
- `qa-profile-03-edit-full`: after clearing the business name, Android could
  not scroll/find `btn-profile-save`.
- `qa-admin-02-tenants-add-invite`: repeated Android ANRs, then login submit
  button was not found.
- `qa-admin-03-properties-create`: failed after the ANR/bad-state cascade;
  expected `Log In` was not visible.

### Artifacts
- Per-flow logs: `/tmp/unit-android-e2e/maestro-logs/`
- Final logcat: `/tmp/unit-android-e2e/logcat-final.txt`
- Dedicated status record: `docs/android-e2e-status-2026-06-01.md`

### Remaining
- Reboot the Android emulator and rerun only the failed/incomplete flows from a
  clean state.
- Inspect logcat around the ANRs, the paid-promotion submit failure, the
  reset-password routing failure, and the profile edit save reachability
  failure.
- Do not promote Android to production until the paid-promotion path,
  reset-password path, profile edit path, nearby feed expectations, and admin
  flows are green on a fresh production Android artifact.

## 2026-05-31 — Android production E2E release input preflight

### Changed
- Android production E2E now scans release bundle inputs for macOS `dataless`
  source/assets before Gradle starts. This turns the local
  `createBundleReleaseJsAndAssets` stall into an actionable
  `android-release-inputs.log` failure.
- Added `npm run release:check-inputs` and wired it into production/staging
  mobile release checks so dataless local files are caught before commands that
  read or bundle source files.
- Added `npm run release:materialize-inputs`, a dry-run-first macOS helper for
  listing dataless release inputs and optionally requesting a `brctl` download.
- Local E2E-triggered Android release builds now set `UNIT_E2E_RELEASE_BUILD`
  and pass Expo `export:embed` `--max-workers 1` through Gradle for more
  deterministic workstation builds.

### Verified
- `node --check scripts/e2e/run-all.mjs`
- `node --check scripts/check-release-inputs.mjs`
- `npm run release:check-inputs` fails quickly with the current 128 dataless
  mobile source/asset files, as intended.
- `npm run release:materialize-inputs` dry-run lists the same files. The
  explicit `UNIT_MATERIALIZE_RELEASE_INPUTS=1` `brctl` download attempt
  completed but did not clear the dataless flags on this workstation.
- A synthetic-env direct `expo export:embed` probe still timed out while the
  project contained dataless source/assets.
- The release-input scan currently finds 128 dataless mobile source/asset
  files on this workstation.

### Remaining
- Android release E2E cannot be certified on this workstation until the
  dataless mobile files are materialized locally. After that, rerun a fresh
  release build/install, the production install gate, targeted admin login, and
  the full Android suite.

## 2026-05-29 — Android production AAB E2E pass triaged

### Changed
- **Android tab-screen action reachability** — Promotion create, pending-payment,
  and profile edit screens now leave extra bottom scroll padding so primary
  actions are not trapped under the Android tab bar during production E2E.
- **Modal action reachability** — Shared modal sheets now cap height at 90% so
  form bodies scroll and action buttons remain reachable on Android.
- **Android Maestro selectors** — Hardened failing production flows to target
  visible action text or stable IDs for promotion cancel, profile save, property
  modal close, Stripe Pay Now, and promotion-review confirm actions.
- **EAS archive hygiene** — Added `.easignore` so remote production builds do
  not upload local native build folders, dependencies, reports, local planning
  state, Supabase workspace files, Maestro flows, or secret/env files.

### Verified
- Installed production EAS Android AAB build
  `6c602432-f90b-468d-8663-f7e78fc5b9dd` through `bundletool`; `dumpsys package
  com.unitapp.mobile` reported versionCode `3` without `DEBUGGABLE`.
- Production Android run `prod_android_aab_cert_20260529` passed seed,
  cross-account sync, production install gate, auth, home, directory, business,
  community, alerts, profile QR/share, profile push, most admin/landlord routes,
  pricing, push broadcast, and permissions coverage.
- EAS archive inspect now completes with a 3.4 MB project directory and the
  remote upload reports 1.6 MB. Fresh production Android build
  `f59c8c9c-9a51-4826-a051-0958a106a0b0` finished with versionCode `6` and was
  installed via `bundletool`; `dumpsys package com.unitapp.mobile` reported
  `pkgFlags` without `DEBUGGABLE`.
- Focused production reruns on versionCode `6` cleared the known failing flows:
  `prod_android_focused_f59c8c9c_20260529` passed promotion cancel, pending
  payment edges, profile edit/save, property create modal close, and Stripe
  return; `prod_android_focused_fix2_f59c8c9c_20260529` passed M5 paid
  promotion Stripe Checkout and admin promotion review all-actions.

### Remaining
- Android is still red until the full suite is green. Partial full-suite run
  `prod_android_full_f59c8c9c_20260529` passed seed, sync, production install
  gate, auth 01-04, home, directory, business, community, and retried
  promotions 01 successfully, but `qa-auth-05-routing-redirects` failed the
  admin login landing assertion and later repeated Android ANR/login issues
  blocked `qa-promotions-02-create-cancel-paths`.

## 2026-05-29 — Production-target iOS certification and Android blocker isolated

### Changed
- **Expo SDK patch alignment** — Updated Expo package patch versions so
  `expo-doctor` passes in the production release gate.
- **Android E2E runner guard** — Android no-clear-state dev-client preparation
  now only runs when Metro is enabled, and Metro cold-start waits are
  configurable/longer for production loops.
- **Android production install gate** — Production Android E2E now inspects
  `adb shell dumpsys package com.unitapp.mobile` and fails before Maestro if the
  installed app is debuggable, preventing a dev-client/debug APK from being
  mistaken for a production-ready build.

### Verified
- `npm run release:check` passed: release env, edge guard, lint, typecheck,
  brand lint, Jest, and Expo Doctor.
- Production E2E doctor, seed, and cross-account sync passed.
- iOS full suite passed in run `prod_full_cert_20260529`, including Stripe
  Checkout test mode with the `4242` test card returning to `Awaiting Review`.
- Production Android install gate run `prod_android_install_gate_20260529`
  correctly failed before Maestro because the installed package reported
  `DEBUGGABLE`.

### Remaining
- Android remains red: `prod_full_cert_20260529_android_rerun2` reached
  `qa-auth-01-login-validation.yaml` and passed early auth branches, but timed
  out during admin login after an Android dev-client ANR/splash state.
- Local `npx expo run:android --variant release --no-bundler` did not complete
  a release install; the installed `com.unitapp.mobile` package still reported
  `DEBUGGABLE`.
- Local Hermes release assembly still deadlocks inside Gradle's
  `createBundleReleaseJsAndAssets` producer on this workstation. The
  2026-05-31 follow-up isolated the current cause as macOS `dataless` mobile
  source/assets, which also stalls a direct Expo `export:embed` probe until the
  project files are materialized locally.

## 2026-05-27 — Production Stripe launch runbook and release gate stabilization

### Added
- **Live Stripe launch runbook** — Added `docs/handoff/PRODUCTION_LIVE_STRIPE_LAUNCH.md` with the required production setup path for live Stripe keys, live webhook endpoint/events, portal host env, Supabase production checks, EAS/App Store setup, App Review notes, final live-payment verification, and rollback.
- **Handoff links** — Linked the live Stripe launch checklist from the handoff README, deployment runbook, and E2E production-readiness docs so release operators have one durable source of truth.

### Changed
- **Jest release gate** — Limited Jest roots and ignored native build outputs in `jest.config.js`, preventing release checks from crawling iOS/Android build artifacts and timing out.

### Verified
- `npm run release:check` — release env, edge guard, lint, typecheck, brand lint, Jest, and Expo Doctor passed.
- `git diff --check`
- Targeted docs secret scan found no live/test keys or webhook secrets.

## 2026-05-18 — Community post image viewing fixed

### Fixed
- **Community post cards** — `PostCard` now renders uploaded `image_url` media so business-created posts show their attached images in the Community feed.
- **Community post detail** — Added `app/(tabs)/community/[id].tsx` and wired Community list cards to `/community/:id`, letting tenants tap a post and view its uploaded image full width with author and event context.

### Verified
- `npm run typecheck`
- `npm run lint`
- `npm run brand-lint`
- `git -C unit diff --check -- 'app/(tabs)/community/index.tsx' 'app/(tabs)/community/[id].tsx' components/tenant/PostCard.tsx`
- `npm test -- --runInBand` — 18 suites / 85 tests passed

## 2026-05-18 — Promotion date picker visibility fixed

### Fixed
- **Tenant promotion create dates** — The iOS Start Date / End Date spinner in `app/(tabs)/promotions/create.tsx` now renders with a light theme, explicit brand-ink text, and a stable height so the date wheel visibly loads on the white modal sheet.
- **Admin external promotion dates** — Applied the same fix to `app/(admin)/promotions/new-external.tsx` so admin-created external promotion dates do not inherit the invisible dark-spinner-on-light-sheet behavior.

### Verified
- `npm run typecheck`
- `npm run lint`
- `npm run brand-lint`
- `git -C unit diff --check -- 'app/(tabs)/promotions/create.tsx' 'app/(admin)/promotions/new-external.tsx'`
- `npm test -- --runInBand` — 18 suites / 85 tests passed

## 2026-05-18 — iOS full-suite rerun record

### Verified
- E2E doctor passed for guarded production target with `E2E_IOS_DEVICE=iPhone 17`, production guard enabled, Supabase service role present, and real Android explicitly not required for this iOS-only pass.
- Production-safe QA seed completed for run `e2e_20260518T140257Z_kwrwwu`.
- iOS full-suite runner completed and wrote summary/debug artifacts under `e2e-results/e2e_20260518T140257Z_kwrwwu/`.

### Result
- iOS full suite is **red**: `2 passed, 29 failed`.
- Passing checks: production-safe QA seed and `qa-auth-02-signup-edge.yaml`.
- Dominant failure signature: authenticated tenant/admin login submits credentials, then assertions for `My Property` / `Admin Dashboard` time out across downstream flows.
- Harness regression found: `qa-auth-04-onboarding-edge.yaml` referenced `maestro/subflows/dismiss-ios-save-password.yaml`, but the subflow had been left in the cleanup stash as an untracked file. The subflow is now restored as a tracked file.

### Remaining
- Investigate whether the post-login landing failures are auth/session, profile bootstrap, production seed, or assertion-timing regressions before moving to portal Playwright and Stripe test-mode gates.

## 2026-05-18 — iOS production E2E suite hardening

### Changed
- **E2E doctor** — Added Maestro 2.x executable fallback, real Android detection via `adb devices -l`, optional `E2E_REAL_ANDROID_REQUIRED`, and iOS simulator auto-detection with `iPhone 17` as the default production test target.
- **Environment loading** — E2E scripts now load `.env.e2e.production.local` / local E2E env files while preserving explicitly inherited shell variables, so one-off guarded production runs do not get overwritten by dotenv defaults.
- **iOS Maestro runner** — Added iOS temp-flow stabilization for direct app launches, release-style `unit://` opens, the `Open in "UNIT"?` system confirmation, session-restore launches, and startup prompt settling.
- **Flow hardening** — Stabilized onboarding property selection, directory category reset, and community post/event creation by dismissing keyboards and overlays, using stable selectors, and scrolling submit buttons into view.

### Verified
- `git diff --check` passed for the staged E2E runner and Maestro flow changes.
- Built and installed a production-variant iOS simulator app on `iPhone 17`.
- Latest iOS run reached green checkpoints through seed, auth login validation, signup edge, reset password, onboarding edge, routing redirects, home feed, nearby 20-mile relation checks, directory search/filter/detail, and business contact actions.

### Remaining
- Full production readiness still requires a clean full iOS rerun, Android real-device Maestro suite, portal Playwright suite, Stripe test-mode verification, code review, and two consecutive green full E2E cycles.
- Pushed commit: `233f9dc test(e2e): harden iOS production suite`.

## 2026-05-17 — Cross-surface sync UAT: mobile fixes live-validated

### Verified (live UAT)
- **Fix #1 — Mobile admin advertiser approval** ✅ — Mobile admin approved a portal-registered advertiser; `advertiser_profiles.status` flipped to `active`, confirmed by live DB query. Cross-surface sync verified.
- **Fix #2 — Portal moderation queue** ✅ — Tenant submitted a content report on mobile; report appeared in both the mobile admin moderation queue and the portal `/admin/moderation` page. Fix #2 confirmed end-to-end.
- Full UAT results at `.planning/quick/260515-uat-cross-surface-sync/RESULTS.md`.

## 2026-05-15 — Advertiser approval admin screen

### Added
- **Mobile admin advertiser approval screen** — `app/(admin)/advertiser-accounts.tsx` lets mobile admins approve, suspend, or reactivate advertiser accounts that signed up through the web portal. Closes the cross-surface gap where advertiser approval was previously portal-only, leaving mobile-only admins unable to unlock new advertisers.
- **Service + hook** — `services/advertiserAccounts.ts` (list with promotion counts, setStatus) and `hooks/useAdvertiserAccounts.ts` (React Query wrapper). Reads/writes the same `advertiser_profiles` table the portal's server actions hit, so changes from either surface stay in sync.
- **Stack registration + dashboard nav** — Registered `advertiser-accounts` route in `(admin)/_layout.tsx` and added a navigation card on the admin dashboard with the `BadgeCheck` icon.

### Verification
- `npx tsc --noEmit` → 0 errors
- `npm run brand-lint` → brand-lint-clean
- `npm test` → 85 / 85 tests across 18 suites
- ESLint on changed files → 0 warnings
- No `Platform.OS` conditionals — iOS and Android share identical behavior
- Cross-checked portal pattern at `portal/lib/admin/advertisers.ts` for parity (same status transitions, same `advertiser_profiles` writes, same promotion-count display)

## 2026-05-13 — Apple account deletion compliance

### Fixed
- **Tenant deletion modal retention disclosure** — Added required disclosure sentence informing tenants that UNIT may retain limited records for legal, security, or fraud prevention purposes and that any retained records will no longer be linked to their identity. Matches the disclosure already present in the admin deletion modal and the web `/delete-account` page. Required by [Apple account deletion guidelines](https://developer.apple.com/support/offering-account-deletion-in-your-app).
- **Tenant profile policy links** — Added in-app Terms of Use, Privacy Policy, and Account Deletion Help links to the tenant profile Settings card, matching the links already present in the admin profile.

### Verification
- `app/(tabs)/profile/index.tsx` deletion modal shows retention disclosure before user confirms
- `app/(admin)/profile.tsx` deletion modal unchanged and already compliant
- `portal/app/delete-account/page.tsx` web fallback unchanged and already compliant
- `constants/policy.ts` supplies `policyUrls.terms`, `policyUrls.privacy`, `policyUrls.accountDeletion`

## 2026-05-12 — Restore light app icon for store builds

### Fixed
- **Light UNIT app icon restored** — Replaced the dark app icon artwork with the light iOS v3 app icon for Expo `icon`, Android adaptive icon, favicon, and the generated iOS AppIcon asset used by local native builds.
- **Release guard added** — Added `npm run icon:check` and wired it into production/staging release checks so the known dark UNIT icon hash fails before another store build can be shipped.

### Verification
- `npm run icon:check`
- Production Expo config points `icon` to `./assets/icon.png`, Android adaptive foreground to `./assets/adaptive-icon.png`, and favicon to `./assets/favicon.png`.

## 2026-05-12 — Google Play compliance and Sentry store-build upload guard

### Added
- **Google Play Billing compliance path** — Added Android in-app purchase support for tenant promotion checkout, Google Play product IDs on promotion pricing tiers, backend Android Publisher API purchase verification, and Google Play payment audit fields.
- **UGC safety controls** — Added Terms acceptance before posting/uploading, content/business reporting, blocked-business filtering, and an admin moderation queue.
- **Play policy URLs** — Added public privacy, terms, and account deletion URL support plus in-app links for tenants/admins.

### Changed
- **Sentry upload disabled for store builds** — Production EAS and the Android release workflow now set `SENTRY_DISABLE_AUTO_UPLOAD=true`. The Sentry Expo plugin may still warn about missing org/project metadata, but source-map upload is skipped and crash capture can still use `EXPO_PUBLIC_SENTRY_DSN`.
- **Android permission surface** — Release manifest removes unused `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE`, and `WRITE_EXTERNAL_STORAGE`; Play Billing, camera, notifications, network, and vibration remain.

### Verification
- `npm run typecheck`
- `npm run lint`
- `npm run edge:check`
- `npm test -- --runInBand` — 18 suites, 85 tests
- Portal `npm run build`
- `./gradlew :app:processReleaseMainManifest --no-daemon`
- `./gradlew :app:assembleRelease --no-daemon`
- Release manifest check confirmed blocked sensitive permissions absent and `com.android.vending.BILLING` present.

### Release blocker
- Production Android AAB uploaded to EAS Build: `6c602432-f90b-468d-8663-f7e78fc5b9dd`, versionCode `3`, artifact `https://expo.dev/artifacts/eas/eocjwL8vF7T9oQdPMTPSWR.aab`.
- Google Play submission is blocked until `unit/google-play-key.json` exists locally or `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` is configured in CI, and that service account has Google Play Console access for `com.unitapp.mobile`. The local key helper failed because `ketchel.david@gmail.com` lacks permission to enable `androidpublisher.googleapis.com` on Google Cloud project `cultrhealth`.

## 2026-05-12 — Android Google Play internal release automation

### Added
- **GitHub Actions Android release workflow** — Added manual `Android Release to Google Play Internal` workflow that runs production release checks, recreates `google-play-key.json` from `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, validates the Google Play/EAS preflight, and starts an EAS Android production build with optional auto-submit to the configured Play internal track.
- **Google Play release helper scripts** — Added scripts to create the Google Play service account key and preflight the Android submit configuration before CI attempts a store upload.

### Changed
- **Deployment runbook memory** — Documented the required GitHub secrets, EAS production environment requirement, and the internal-track-first promotion policy for Android releases.

### Verification
- `actionlint unit/.github/workflows/android-release.yml`
- `ruby -e "require 'yaml'; YAML.load_file('unit/.github/workflows/android-release.yml')"`
- `node -e "JSON.parse(require('fs').readFileSync('unit/eas.json','utf8')); JSON.parse(require('fs').readFileSync('unit/package.json','utf8'))"`
- `npm run release:check -- --help` completed release env checks, Expo lint, TypeScript, brand lint, and Jest before printing Expo Doctor help.
- `npx expo-doctor` — 17/17 checks passed.

## 2026-05-12 — iOS production E2E green

### Fixed
- **Home Nearby radius** — Home Nearby now uses the shared 20-mile radius constant for the UI label, empty copy, hook default, service default, and tests.
- **Nearby feed coverage** — The E2E seed creates current-property, nearby-property, and outside-radius control activity. The focused Maestro flow verifies origin and nearby activity appear while outside-radius activity stays hidden after refresh.
- **Forced reset-password flow** — The reset screen now completes through the `complete-password-reset` Edge Function and refreshes the profile after success, avoiding the simulator blocker in the full suite.
- **Mobile checkout return path** — Pending-payment now uses the configured app deep-link base and confirms paid sessions through the checkout Edge Function as a fallback to delayed webhooks.
- **Maestro runner targeting** — The E2E runner passes the explicit Maestro platform for iOS and Android suite execution.

### Verification
- Full iOS suite: `e2e_20260512T023846Z_kuicrw`, `31 passed, 0 failed`.
- Static checks: `node --check scripts/e2e/seed.mjs`, `npm run lint -- --quiet`, `npm run typecheck -- --pretty false`, `npm run edge:check`.

### Note
- Android remains blocked locally by Maestro Android driver/emulator instability, not by a failing Home Nearby or checkout assertion.

## 2026-05-08 — Navigation responsiveness and loader polish

### Changed
- **Reduced route-loading flicker** — `LoadingScreen` now shows the UNIT logo only during real app startup/auth bootstrap. Route-level loading states use a quiet spinner so tab navigation no longer feels like the app is relaunching.
- **Warmed tenant tab data** — The tenant tab layout now prefetches the first-pass Home, Directory, Community, Promotions, Alerts, nearby-property, and Profile data after login to make first visits feel more responsive.

### Verification
- `npm run typecheck`
- `npm test -- --runInBand`
- iPhone 16 Pro Max simulator tenant tab sweep confirmed Home, Directory, Promotions, Community, Alerts, and Profile open without the full-screen UNIT-logo loader during navigation.

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

## 2026-06-01 — Android production hardening follow-up

### Fixed
- Made Android tenant promotion submission testable without coordinate taps by
  keeping `promotion-submit` in a sticky, keyboard-aware action bar.
- Preselected the cheapest active promotion price tier on pending-payment so
  Android paid-promotion checkout starts from a deterministic tier state.
- Made profile edit Save/Cancel sticky and keyboard-aware so required-field
  validation cannot strand `btn-profile-save` below the viewport.
- Defaulted the admin dashboard to the first assigned property while the
  selector loads, reducing transient empty/admin-login states.

### Tests
- Updated the paid-promotion Maestro flow to use `promotion-submit` on Android.
- Updated the profile edit Maestro flow to rely on sticky Save/Cancel actions.
- Updated the Nearby feed flow to scroll for the origin announcement after the
  neighbor assertion because Nearby feed order is chronological.

### Checkpoint
- Stopped verification at 2026-06-01 14:25 EDT per user request.
- `npm run typecheck` and direct `tsc --noEmit --pretty false` hung without
  diagnostics; typecheck remains blocked.
- Android emulator boot was unstable unless kept in a foreground session.
- The installed emulator app was stale (`versionCode=1`, last updated
  2026-05-17), so Maestro was not run because it would not validate today's
  patch.
- A fresh `:app:installDebug` began Gradle tasks from `android/` but was stopped
  before completion for checkpointing.

### Fixed
- Fixed the `npm run typecheck` hang root cause: `tsconfig.json` was including
  generated native/build directories via `**/*.ts` / `**/*.tsx`, causing
  TypeScript to crawl iOS Pods/native framework artifacts. Added excludes for
  `android`, `ios`, `.expo`, `dist`, `build`, and `coverage`.
- Scoped `typecheck` to app production source/config paths rather than tests
  and utility scripts, because several `__tests__` and `scripts` files are
  currently cloud-dataless on this Mac and return `Operation timed out` when
  macOS tries to hydrate them.
- Added keyboard-height tracking to sticky promotion/profile action bars so
  Android Save/Submit controls remain visible above the soft keyboard.
- Added stable test IDs to segmented controls and switched the Android Nearby
  flow to `home-segment-nearby-20-mi`.
- Hardened the tenant login Maestro subflow to recover from Expo dev-client
  launcher/tutorial and `Error loading app: timeout` states.

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
