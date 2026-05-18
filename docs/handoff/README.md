# UNIT Client Handoff Packet

Last updated: 2026-05-10

This packet is the owner manual for taking UNIT from contractor-managed delivery to client-owned operations.

## Required Reading

1. [Staging Release Rehearsal](./STAGING_RELEASE_REHEARSAL.md)
2. [Admin Guide](./ADMIN_GUIDE.md)
3. [Incident Guide](./INCIDENT_GUIDE.md)
4. [Deployment Guide](./DEPLOYMENT_GUIDE.md)
5. [Account Inventory](./ACCOUNT_INVENTORY.md)
6. [Backup and Recovery](./BACKUP_RECOVERY.md)

## Production Readiness Gate

Do not hand off production ownership until all of these are true:

- Staging and production use separate Supabase projects. No staging user, business, promotion, or payment data may share the production database.
- Staging uses Stripe test mode. Production uses Stripe live mode only after the client signs off.
- Vercel has separate Preview/Staging and Production environment variables.
- EAS has separate build profiles and app identifiers:
  - Development: `com.unitapp.mobile.dev`, scheme `unit-dev`
  - Staging: `com.unitapp.mobile.staging`, scheme `unit-staging`
  - Production: `com.unitapp.mobile`, scheme `unit`
- Stripe webhook endpoints are separate per environment and point to the matching portal URL.
- Sentry is configured for mobile, portal, and Supabase Edge Functions.
- A client-owned admin can complete the staging rehearsal without contractor-only access.

## Handoff Evidence

Store the following evidence in the client project folder before signoff:

- Staging rehearsal checklist with timestamps, tester names, and screenshots.
- TestFlight or internal Android build link for the staging build.
- Portal staging deployment URL.
- Stripe test payment event IDs and webhook delivery IDs.
- Supabase migration version applied to staging and production.
- Sentry test event IDs from mobile, portal, and Edge Functions.
- Account ownership confirmation for Supabase, Stripe, Apple, Google Play, Vercel, Resend, Sentry, and Expo/EAS.
