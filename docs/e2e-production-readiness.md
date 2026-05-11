# UNIT Production Readiness E2E

This automation runs the UNIT production-readiness E2E pass from the canonical
project root:

```bash
cd /Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT-PRoject
```

## Commands

```bash
npm run e2e:doctor
npm run e2e:mobile:ios
npm run e2e:mobile:android
npm run e2e:portal
npm run e2e:all
```

Mobile-only aliases are also available from `unit/`:

```bash
npm run e2e:auto
npm run e2e:auto:ios
npm run e2e:auto:android
```

Portal-only automation is available from `portal/`:

```bash
npm run e2e:auto
```

## Production Guard

Production seeding is refused unless explicitly enabled:

```bash
E2E_TARGET=production E2E_ALLOW_PRODUCTION=1 npm run e2e:all
```

For an additional safety check, pin the expected Supabase URL:

```bash
E2E_TARGET=production \
E2E_ALLOW_PRODUCTION=1 \
E2E_EXPECTED_SUPABASE_URL=https://your-project.supabase.co \
npm run e2e:all
```

The seed script only creates or resets QA-marked records:

- `tenant1@unit-test.com`
- `tenant-reset@unit-test.com`
- `david@cultrhealth.com`
- `QA E2E Property`
- rows titled or named with `QA E2E`

Do not run this against production with a real user email in the QA account
configuration.

The existing Maestro admin login flow uses `david@cultrhealth.com`. Because
that is not a `@unit-test.com` address, the production seed refuses to reset it
unless this additional flag is present:

```bash
E2E_ALLOW_SHARED_ADMIN_RESET=1
```

Use that only when you intentionally want the automated suite to reset the
existing Maestro admin identity to the test password used by the flows.

If `NEXT_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_URL` points at any
non-localhost Supabase project, the seed and full runner refuse to write unless
one of these is true:

- production: `E2E_TARGET=production E2E_ALLOW_PRODUCTION=1`
- non-production remote test project: `E2E_ALLOW_REMOTE=1`

## Android Requirements

Install and verify:

- Android Studio
- Android SDK
- Android Emulator
- `adb` in `PATH`
- AVD named `UNIT_Pixel_8_API_36`

Boot the emulator before the first run, or let the automation start it:

```bash
emulator -avd UNIT_Pixel_8_API_36
adb devices
```

If the Android app is not installed, allow the runner to build/install it:

```bash
E2E_TARGET=production \
E2E_ALLOW_PRODUCTION=1 \
E2E_BUILD_MISSING=1 \
npm run e2e:mobile:android
```

The Android production package is `com.unitapp.mobile`. Staging is
`com.unitapp.mobile.staging`.

## iOS Requirements

The default simulator is `iPhone 16 Pro Max`. Override it when needed:

```bash
E2E_IOS_DEVICE="iPhone 16 Pro" npm run e2e:mobile:ios
```

If the iOS app is not installed, allow the runner to build/install it:

```bash
E2E_TARGET=production \
E2E_ALLOW_PRODUCTION=1 \
E2E_BUILD_MISSING=1 \
npm run e2e:mobile:ios
```

## Metro

The runner starts Metro on port `8081` by default for local dev-client testing.
If you are validating a standalone EAS build that does not need Metro:

```bash
E2E_START_METRO=0 npm run e2e:all
```

## Reports

Each run writes artifacts to:

```text
e2e-results/<run-id>/
```

Important files:

- `summary.md`
- `summary.html`
- `summary.json`
- `doctor.log`
- `seed.log`
- `ios/*.log`
- `android/*.log`
- `portal-playwright.log`

The mobile runner executes each child Maestro flow separately. A failing flow is
retried once, then the runner continues to the next flow so the report shows the
complete failure set.

## Google Play Readiness

After Android E2E passes on staging or production build artifacts, submit using
the existing EAS profile:

```bash
cd /Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT-PRoject/unit
eas submit --platform android --profile production
```

This requires:

- Google Play Console app
- `google-play-key.json` at `unit/google-play-key.json`
- Matching package `com.unitapp.mobile`
