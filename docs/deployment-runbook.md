# Deployment Runbook

This document covers everything needed to develop, build, and ship the UNIT app from scratch.

---

## Local Development

### Prerequisites

- Node.js 18+
- npm
- Expo CLI (via `npx expo`)
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

Ensure your project is linked and you are authenticated with the Supabase CLI.

```bash
npx supabase link --project-ref <your-project-ref>
```

For the current production project, the project ref is `ouvneoaqoilnigynlvbp`.

Verify the local migration history matches the remote project before applying anything:

```bash
npx supabase db push --dry-run
```

Apply all pending migrations with:

```bash
npx supabase db push
```

**Seed strategy:** the canonical Decker property/unit data now lives in `20260406000500_seed_decker_properties.sql`.
- `20260406000300_seed_properties.sql` is a legacy no-op placeholder kept only to preserve migration ordering.
- `20260407193000_reconcile_property_seeds.sql` repairs older deployments by moving any short-name property references onto the canonical LLC-backed rows before deleting the duplicates.

The migrations include:

| File | Description |
|------|-------------|
| `20260406000100_initial_schema.sql` | Core tables and types |
| `20260406000200_units_table.sql` | Units table |
| `20260406000300_seed_properties.sql` | Legacy placeholder kept for migration continuity |
| `20260406000400_landlord_auth.sql` | Landlord auth and RLS |
| `20260406000500_seed_decker_properties.sql` | Canonical Decker properties and unit data |
| `20260406000600_auto_profile_creation.sql` | Auto-create profile on signup |
| `20260406000700_financial_workflows.sql` | Invoices, payments, financials |
| `20260406000800_mobile_mvp.sql` | MVP mobile features |
| `20260406000900_m2_schema_fixes.sql` | Milestone 2 schema corrections |
| `20260406001000_security_hardening.sql` | Security hardening and fixes |
| `20260407193000_reconcile_property_seeds.sql` | Reconcile older duplicate short-name property seeds |

*(Alternatively, you can apply them via the Supabase Dashboard SQL editor sequentially).*

### Edge Functions

Deploy all active Edge Functions:

```bash
npx supabase functions deploy invite-tenant
npx supabase functions deploy complete-onboarding
npx supabase functions deploy add-property-to-admin
npx supabase functions deploy send-push-notification
```

### Edge Function Secrets

Hosted Supabase automatically injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for Edge Functions. Set the custom Resend secrets explicitly:

```bash
npx supabase secrets set \
  RESEND_API_KEY=<your-resend-api-key> \
  RESEND_FROM_EMAIL=<your-sender-email>
```

`invite-tenant` uses these values for invitation emails. If `RESEND_FROM_EMAIL` is omitted, the function falls back to `UNIT <noreply@unit-app.com>`, but production should use a verified sender address.

### Storage

The `public-assets` bucket can be created manually in the Supabase dashboard (Storage > New bucket), or by running the following SQL in the SQL editor:

```sql
insert into storage.buckets (id, name, public) values ('public-assets', 'public-assets', true);
create policy "Public Access" on storage.objects for select using ( bucket_id = 'public-assets' );
create policy "Authenticated users can upload" on storage.objects for insert to authenticated with check ( bucket_id = 'public-assets' );
```

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
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected by hosted Supabase Edge Functions | Admin-level DB operations |
| `RESEND_API_KEY` | Edge Function secrets | Transactional email delivery |
| `RESEND_FROM_EMAIL` | Edge Function secrets | Sender email address for invites |

Variables prefixed with `EXPO_PUBLIC_` are embedded into the app bundle at build time and are visible to end users — never put secrets in these variables.
