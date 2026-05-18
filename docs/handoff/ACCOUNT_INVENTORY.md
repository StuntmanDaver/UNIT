# Account Inventory

The client should own these accounts before production launch. Contractor accounts may remain as temporary collaborators only during the warranty/support period.

| Account | Client Owner | Required Access | Notes |
| --- | --- | --- | --- |
| Supabase staging | TBD | Owner | Separate project from production. |
| Supabase production | TBD | Owner | Protect service role key. Enable PITR if available. |
| Stripe | TBD | Administrator | Staging uses test mode. Production uses live mode after signoff. Require 2FA. |
| Apple Developer | TBD | Account Holder or Admin | Needed for TestFlight and App Store submission. |
| Google Play Console | TBD | Admin | Needed for internal testing and Play Store release. |
| Expo/EAS | TBD | Owner/Admin | Needed for builds, credentials, updates, and submissions. |
| Vercel | TBD | Owner/Admin | Separate staging/production env vars. |
| Resend | TBD | Admin | Used for tenant invitation emails. |
| Sentry | TBD | Admin | Projects for mobile, portal, and Edge Functions. |
| GitHub mobile repo | TBD | Admin/Maintain | `unit/` remote currently points at GitHub. |
| Portal repo | TBD | Admin/Maintain | Local only until remote is created. |

## Credentials Rules

- No personal email should be the sole owner of a production account.
- Enable 2FA on Stripe, Apple, Google, Vercel, Supabase, GitHub, Sentry, Resend, and Expo.
- Store secrets in the platform secret manager, not in code or shared documents.
- Rotate secrets after contractor handoff if they were ever copied into a chat, document, or local machine outside the client-controlled environment.
- Keep staging and production service role keys, Stripe keys, webhook secrets, Sentry auth tokens, and Resend keys separate.

## Handoff Checklist

- Client owner can log into each account.
- Client owner can invite/remove collaborators.
- Billing contact is client-owned.
- Recovery email/phone is client-owned.
- API keys and webhooks are named by environment.
- Contractor access level and removal date are documented.
