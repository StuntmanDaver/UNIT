# UNIT Store Submission Packet

Updated: 2026-06-28

This packet is the handoff checklist for the first App Store and Google Play
submission. It intentionally separates assets and binaries that are ready from
provider actions that still require account-owner work.

## App Identity

| Field | Value |
| --- | --- |
| App name | UNIT |
| Version | 1.0.0 |
| iOS bundle ID | `com.unitapp.mobile` |
| Android package | `com.unitapp.mobile` |
| URL scheme | `unit` |
| Expo owner | `stuntmandaver` |
| App Store Connect app ID | `6767079612` |
| Google Play track | `internal` for first release automation |
| Marketing website | `https://unit-tenant-app.netlify.app` |
| Privacy policy | `https://unit-legal-pages.vercel.app/privacy` |
| Terms | `https://unit-legal-pages.vercel.app/terms` |
| Account deletion | `https://unit-legal-pages.vercel.app/delete-account` |

## Store Binaries

| Platform | EAS build | Store version | Source commit | Artifact |
| --- | --- | --- | --- | --- |
| iOS | `17665c78-19be-4131-9e06-a95b56f23900` | `1.0.0` build `16` | `c26988cef18c60b972f15dcfc344f66dbf61f186` | `https://expo.dev/artifacts/eas/6TNTnkKKhtnB54ZAGKi5Lf1dueJLU4KuksFjEARNxyk.ipa` |
| Android | `395a00fb-1156-4b3f-a79b-43fb8e6989ac` | `1.0.0` versionCode `7` | `c26988cef18c60b972f15dcfc344f66dbf61f186` | `https://expo.dev/artifacts/eas/4j5ihyTC6L4hkLojAorAa81dJnmZC-oXTPPv5-mZGg0.aab` |

The evidence commit after these binaries is documentation-only. The submitted
binary source remains `c26988cef18c60b972f15dcfc344f66dbf61f186`.

## Screenshot Assets

Use the tracked portrait screenshots below for the first listing. The
`release:check-store-assets` preflight verifies these files exist and meet the
minimum portrait dimensions.

### App Store

- `colorway-tenant-home.png`
- `colorway-tenant-directory.png`
- `colorway-tenant-community.png`
- `colorway-tenant-promotions.png`
- `colorway-tenant-profile.png`
- Optional admin evidence screenshots: `colorway-admin-dashboard.png`, `colorway-admin-promotions.png`, `colorway-admin-tenants.png`

### Google Play

- `colorway-tenant-home.png`
- `colorway-tenant-directory.png`
- `colorway-tenant-community.png`
- `colorway-tenant-promotions.png`
- `colorway-tenant-pending-payment.png`
- Optional admin evidence screenshots: `colorway-admin-dashboard.png`, `colorway-admin-pricing.png`, `colorway-admin-push.png`

## Listing Copy

The reusable metadata files live in:

- `fastlane/metadata/en-US/`
- `fastlane/metadata/android/en-US/`

Short description:

```text
Connect tenants, businesses, updates, and promotions inside your commercial property.
```

Full description:

```text
UNIT helps tenants inside commercial properties discover nearby businesses,
share community updates, receive property notifications, and manage promotions
from one place. Tenants can browse the building directory, post announcements
or events, edit their business profile, and view alerts from property admins.

Property admins can manage tenants, properties, promotion review, pricing tiers,
and push broadcasts through admin-only tools. UNIT is built for property-scoped
communities, so users see the tenants and updates that belong to their assigned
property.
```

Keywords:

```text
commercial property, tenants, directory, community, promotions, property management
```

## Review Notes

Use neutral reviewer language and avoid internal QA labels.

```text
UNIT is a property-scoped tenant community app. Sign in with the provided review
account to see a seeded tenant property, directory, community posts, promotions,
notifications, and profile settings. Admin-only screens are available only to
accounts with property admin access.

Paid promotion purchasing is not exposed in the iOS App Store build while UNIT
completes App Store payment compliance. Promotion checkout and webhook handling
are validated through the advertiser portal and production readiness evidence.
```

## Required Owner Actions

1. Apple Account Holder accepts the missing or expired App Store Connect
   agreement. After that, rerun `npm run appstore:auth:check` and
   `npm run release:ios:submit`.
2. Google Play Console owner manually uploads Android build
   `395a00fb-1156-4b3f-a79b-43fb8e6989ac` / versionCode `7` once. After the
   first submission exists, rerun `npm run release:android:submit`.
3. Stripe Dashboard owner changes the UNIT account business website from
   `CultrVentures.com` to `https://unit-tenant-app.netlify.app`, then verifies
   `charges_enabled=true` before public paid checkout. Stripe rejected an API
   attempt to update the platform's own account profile, so this has to be done
   in Dashboard.

## Local Verification

Run these before each store retry:

```bash
npm run release:check-store-assets
npm run production:readiness:check -- --allow-external-blockers
```

Run the strict readiness gate only after the Apple, Google Play, and Stripe
provider actions are complete:

```bash
npm run production:readiness:check
```
