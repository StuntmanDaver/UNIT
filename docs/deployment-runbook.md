# Deployment Runbook

This document covers everything needed to develop, build, and ship the UNIT app from scratch.

---

## Local Development

### Prerequisites

- Node.js 18+
- npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (via Xcode, macOS only) or Android Emulator (via Android Studio)

### Setup

1. Clone the repository and install dependencies:

   ```bash
   git clone <repo-url>
   cd unit
   npm install --legacy-peer-deps
   ```

2. Copy the environment template and fill in your credentials:

   ```bash
   cp .env.example .env.local
   ```

   Open `.env.local` and set:
   - `EXPO_PUBLIC_SUPABASE_URL` — your Supabase project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon/public key
   - `EXPO_PUBLIC_APP_URL` — app deep link base URL (e.g. `unitapp://`)

3. Start the development server:

   ```bash
   npx expo start
   ```

   - Press `i` to open in iOS Simulator
   - Press `a` to open in Android Emulator
   - Press `w` to open in the browser (web)

---

## Supabase Setup

### Database Migrations

Apply migrations in order. Either use the Supabase CLI:

```bash
supabase db push
```

Or apply each SQL file manually in the Supabase dashboard SQL editor, in this order:

| File | Description |
|------|-------------|
| `supabase/migrations/001_initial_schema.sql` | Core tables and types |
| `supabase/migrations/002_units_table.sql` | Units table |
| `supabase/migrations/003_landlord_auth.sql` | Landlord auth and RLS |
| `supabase/migrations/004_auto_profile_creation.sql` | Auto-create profile on signup |
| `supabase/migrations/005_financial_workflows.sql` | Invoices, payments, financials |
| `supabase/migrations/006_mobile_mvp.sql` | MVP mobile features |
| `supabase/migrations/007_m2_schema_fixes.sql` | Milestone 2 schema corrections |

Note: The `002_seed_properties.sql` and `003_seed_decker_properties.sql` files are seed data — apply only in development/staging environments, not production.

### Edge Functions

Deploy all active Edge Functions:

```bash
supabase functions deploy invite-tenant
supabase functions deploy complete-onboarding
supabase functions deploy add-property-to-admin
supabase functions deploy send-push-notification
```

### Edge Function Secrets

Set the required secrets for Edge Functions:

```bash
supabase secrets set \
  SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> \
  RESEND_API_KEY=<your-resend-api-key> \
  RESEND_FROM_EMAIL=<your-sender-email>
```

These are used by `invite-tenant` (email delivery) and any function requiring elevated database access.

### Storage

Create the public assets bucket in the Supabase dashboard (Storage > New bucket):

- **Name:** `public-assets`
- **Public access:** enabled

This bucket stores property images, business logos, and other publicly accessible media.

---

## EAS Build

### Prerequisites

Install the EAS CLI and authenticate:

```bash
npm install -g eas-cli
eas login
```

Ensure `eas.json` is present at the project root (already committed).

### Build Commands

| Profile | Command | Use Case |
|---------|---------|----------|
| Development (iOS Simulator) | `eas build --platform ios --profile development` | Local dev with dev client |
| Preview (internal distribution) | `eas build --platform android --profile preview` | Internal testing via QR |
| Production (iOS) | `eas build --platform ios --profile production` | App Store submission |
| Production (Android) | `eas build --platform android --profile production` | Google Play submission |

All builds are configured with `autoIncrement: true` for production, so the build number increments automatically.

---

## App Store Submission

### iOS (App Store)

```bash
eas submit --platform ios
```

Requires:
- Apple Developer account with active membership
- App Store Connect API key (set via EAS credentials or `~/.appstoreconnect/private_keys/`)
- Completed App Store Connect listing (description, keywords, screenshots, privacy policy URL)

### Android (Google Play)

```bash
eas submit --platform android
```

Requires:
- Google Play Console account
- Service account JSON key with "Release Manager" role
- Completed Play Store listing (description, screenshots, privacy policy URL)

### Both Platforms Require

- App store description (short and full)
- Screenshots for all required device sizes
- Privacy policy URL (publicly accessible)
- Age rating / content rating questionnaire completed in each store

---

## Web Admin Deploy

Build the web output:

```bash
npm run build:web
```

Output is placed in the `dist/` directory. Deploy using either:

**Vercel:**

```bash
vercel deploy dist
```

**Netlify:**

```bash
netlify deploy --dir dist --prod
```

Ensure environment variables (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) are also set in the hosting platform's environment settings.

---

## OTA Updates (Over-the-Air)

Push a JavaScript bundle update without going through app store review:

```bash
eas update --branch production --message "Brief description of change"
```

**Important constraints:**
- OTA updates only apply to JavaScript/TypeScript changes: UI, business logic, new screens, navigation tweaks.
- OTA updates do NOT work for: new native modules, changes to `app.json`, updated permissions, Expo SDK version bumps, or any change that modifies the native binary.
- When in doubt, do a full EAS build and app store submission.

---

## Environment Variables Reference

| Variable | Location | Purpose |
|----------|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | `.env.local` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` | Supabase anon/public key |
| `EXPO_PUBLIC_APP_URL` | `.env.local` | App deep link base URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function secrets | Admin-level DB operations |
| `RESEND_API_KEY` | Edge Function secrets | Transactional email delivery |
| `RESEND_FROM_EMAIL` | Edge Function secrets | Sender email address for invites |

Variables prefixed with `EXPO_PUBLIC_` are embedded into the app bundle at build time and are visible to end users — never put secrets in these variables.
