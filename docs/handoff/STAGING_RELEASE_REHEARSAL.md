# Staging Release Rehearsal

Use this rehearsal to prove the full client-owned flow before production launch. Run it against production-like staging resources only.

## Environment Requirements

- Supabase staging project with current migrations applied.
- Stripe test mode account keys and a staging webhook endpoint.
- Vercel staging portal deployment with staging environment variables.
- EAS staging build using profile `staging`.
- Mobile app identifier `com.unitapp.mobile.staging` and scheme `unit-staging`.
- Supabase Edge Function secrets for staging:
  - `STRIPE_SECRET_KEY`
  - `MOBILE_APP_URL=unit-staging://`
  - `SENTRY_DSN`
  - `APP_ENV=staging`
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`

## Preflight

1. Apply migrations to staging Supabase.
2. Deploy active Edge Functions to staging Supabase.
3. Deploy the portal to the staging Vercel environment.
4. Register the Stripe staging webhook endpoint:
   - `https://<staging-portal-domain>/api/webhooks/stripe`
5. Confirm Stripe webhook signing secret is set in the staging portal environment.
6. Build and install the staging mobile app:
   - `cd unit`
   - `npm run release:staging:ios:build`
   - `npm run release:staging:android:build`
7. Confirm Sentry receives a manual support diagnostics marker from the staging admin screen.

## Happy Path Script

Record each step with timestamp, tester, account email, and pass/fail.

1. Signup
   - Create a tenant account in the staging app.
   - Confirm Supabase Auth user exists in staging only.
2. Onboarding
   - Complete business profile creation.
   - Confirm the business is scoped to the intended staging property.
3. Approval
   - Log in as a landlord/admin.
   - Approve the tenant.
   - Confirm the tenant can access directory, community, promotions, notifications, and profile.
4. Tenant Usage
   - Update business profile.
   - Create a post with and without an image.
   - Confirm storage object lives in the staging bucket only.
5. Promotion Payment
   - Create a tenant promotion.
   - Pay with a Stripe test card.
   - Confirm mobile returns through `unit-staging://`.
   - Confirm Stripe sends `checkout.session.completed` to the staging webhook endpoint.
   - Confirm promotion changes to `paid` and `pending`.
6. Admin Review
   - Approve the paid promotion.
   - Confirm the promotion is visible in the app.
   - Reject or request revisions for a separate test promotion.
7. Refund Path
   - Reject a paid promotion.
   - Use the refund action.
   - Confirm Stripe test refund exists and promotion payment status is `refunded`.
8. Suspend Path
   - Suspend an approved promotion.
   - Confirm it is hidden or no longer active for tenants.

## Failure Path Script

Run these before launch:

- Cancel Stripe Checkout and confirm the promotion stays unpaid.
- Use an invalid webhook secret in staging temporarily, send a test webhook, then restore it and replay the event from Stripe.
- Disable push permission on one device and confirm admin push still creates in-app notification rows.
- Upload an oversized or invalid image and confirm the app shows a user-facing error.
- Trigger the admin Support screen and verify the Sentry event is searchable by user email and environment.

## Signoff

The rehearsal passes only when:

- Every happy path step passes without manual database edits.
- Every failure path produces a clear recovery action.
- No staging data appears in production Supabase, Stripe, Vercel, or Sentry.
- The client owner can repeat the script using client-owned credentials.
