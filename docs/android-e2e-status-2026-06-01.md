# Android E2E Status - 2026-06-01

## Candidate Tested

- Platform: Android
- Emulator: `UNIT_Pixel_8_API_36`
- Package: `com.unitapp.mobile`
- App version: `1.0.0`
- Android versionCode: `6`
- EAS build ID: `f59c8c9c-9a51-4826-a051-0958a106a0b0`
- EAS artifact: `https://expo.dev/artifacts/eas/wk6hBjcZL25Rvpzncku8zb.aab`
- Build profile/channel: production / production

## Install Method

- Downloaded the EAS production `.aab`.
- Converted it with `bundletool build-apks --mode=universal`.
- Signed the generated APK set with a temporary `/tmp` E2E keystore.
- Installed the generated APK set on the emulator.

This validates the production build contents on an emulator, but not the final
Play Store signing identity.

## Preflight

- Android emulator booted and was visible as `emulator-5554`.
- `release-inputs-ok: mobile source/assets are materialized`.
- `qa-00-full-suite-android.yaml` parsed with 30 child flows and no missing
  flow references.
- Installed app metadata reported `Package [com.unitapp.mobile]`,
  `versionCode=6`, `targetSdk=36`, and `versionName=1.0.0`.

## Result

Status: **red / not production-green**.

- Passed cleanly: 16 flows.
- Failed cleanly before infrastructure degradation: 7 flows.
- Not certified: remaining late admin/deeplink/permission coverage after
  repeated Android ANRs and Maestro driver failures.

## Passed Flows

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

## Failed Flows

- `qa-auth-03-reset-password`
  - Expected `Update Password`, but it did not appear.
  - Maestro artifacts: `/Users/davidk/.maestro/tests/2026-06-01_065959`
- `qa-home-02-nearby-20-mile-feed`
  - Nearby feed showed the neighbor announcement but not the origin
    announcement after switching to Nearby.
  - Maestro artifacts: `/Users/davidk/.maestro/tests/2026-06-01_071326`
- `qa-promotions-01-segments-analytics`
  - Maestro Android driver hit `DEADLINE_EXCEEDED` while erasing login text.
  - Maestro artifacts: `/Users/davidk/.maestro/tests/2026-06-01_072903`
- `m5-02-tenant-paid-promotion`
  - Paid promotion creation did not reach `Pending Payment`.
  - This blocks Android paid-promotion/Stripe certification.
  - Maestro artifacts: `/Users/davidk/.maestro/tests/2026-06-01_074341`
- `qa-profile-03-edit-full`
  - After clearing the business name, Maestro could not find
    `btn-profile-save`.
  - Maestro artifacts: `/Users/davidk/.maestro/tests/2026-06-01_075735`
- `qa-admin-02-tenants-add-invite`
  - Android showed repeated ANR dialogs, then login submit was not found.
  - Maestro artifacts: `/Users/davidk/.maestro/tests/2026-06-01_080719`
- `qa-admin-03-properties-create`
  - Failed after the ANR/bad-state cascade; expected `Log In` was not visible.
  - Maestro artifacts: `/Users/davidk/.maestro/tests/2026-06-01_081042`

## Infrastructure Failure After ANRs

During the admin rerun, Maestro could not reliably reinstall/connect its
Android driver:

- `Broken pipe`
- `UNAVAILABLE`
- `tcp:7001 closed`

Because of that, these late flows are **not certified** by this run:

- `qa-admin-04-advertisers-segments`
- `qa-admin-05-promo-review-all-actions`
- `qa-admin-06-new-external-promo`
- `qa-admin-07-pricing-tier-crud`
- `qa-admin-08-push-broadcast-full`
- `qa-deeplink-01-stripe-return`
- `qa-permissions-01-push-photo`

## Local Artifacts

- Per-flow logs: `/tmp/unit-android-e2e/maestro-logs/`
- Initial final logcat: `/tmp/unit-android-e2e/logcat-final.txt`
- Admin rerun logcat: `/tmp/unit-android-e2e/logcat-after-rerun-admin.txt`

## Production Call

Android should not be shipped as production-green from this run.

Fix or revalidate:

- Reset-password required update routing.
- Nearby feed origin/neighbor expectations.
- Android paid-promotion submit into pending payment.
- Profile edit save reachability on Android.
- Admin login responsiveness and ANR root cause.
- Remaining admin/deeplink/permission flows from a fresh emulator state.

## Follow-up Hardening Patch

Implemented after this red run:

- Made tenant promotion form actions sticky and Android-accessible so
  `promotion-submit` no longer depends on coordinate taps.
- Preselected the cheapest active promotion price tier on pending-payment.
- Made profile edit Save/Cancel sticky and keyboard-aware so
  `btn-profile-save` remains reachable after validation failures.
- Defaulted the admin dashboard to the first assigned property before the
  selector finishes loading, reducing login/dashboard transient empty state.
- Updated the Nearby E2E assertion to scroll for the origin announcement because
  the app already fetches origin + nearby property IDs and feed order is
  chronological.

## Checkpoint — 2026-06-01 14:25 EDT

Verification was stopped for checkpointing before a fresh Android artifact was
installed.

- `npm run typecheck` started `tsc --noEmit` but hung without diagnostics.
- Direct `./node_modules/.bin/tsc --noEmit --pretty false` also hung without
  diagnostics, so typecheck is blocked rather than green or red.
- `UNIT_Pixel_8_API_36` failed to attach to adb during startup.
- `UNIT_Pixel_8_API_35_FRESH` and `UNIT_Pixel_8_API_35` booted, but background
  emulator launches were reaped after boot; keeping `UNIT_Pixel_8_API_35` in a
  foreground session kept `emulator-5554` attached.
- Installed `com.unitapp.mobile` on the emulator was stale:
  `versionCode=1`, `versionName=1.0.0`, `lastUpdateTime=2026-05-17 22:58:04`.
- A fresh `:app:installDebug` attempt from `android/` eventually began Gradle
  tasks, but was stopped before completion at the user's checkpoint request.
- Targeted Maestro reruns and the full Android E2E suite were not run against
  today's patch because no fresh patched Android binary was installed.

Next checkpoint should resume with:

- Resolve or bound the TypeScript hang.
- Complete a fresh Android install from the current working tree.
- Run targeted flows:
  `m5-02-tenant-paid-promotion.yaml`,
  `qa-profile-03-edit-full.yaml`,
  `qa-home-02-nearby-20-mile-feed.yaml`.
- Run `qa-00-full-suite-android.yaml` only after targeted flows pass.
