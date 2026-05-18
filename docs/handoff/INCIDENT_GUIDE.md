# Incident Guide

Use this guide when an operator reports a failure. Start by confirming the environment: staging or production.

## First Response

1. Ask the reporter for:
   - Account email.
   - Property name.
   - Approximate time of failure with timezone.
   - Screenshot or screen name.
   - Whether they used staging or production.
2. If the reporter is an admin, ask them to open Support & Diagnostics and tap Send Diagnostics.
3. Check Sentry for events tagged with the environment, user email, or Edge Function name.
4. Check Supabase logs for auth, database, storage, and Edge Functions.
5. Check Stripe webhook delivery if payment or promotion status is involved.

## Payments Fail

Symptoms:

- Checkout does not open.
- Checkout succeeds but promotion stays unpaid.
- Refund action fails.

Checks:

- Portal env has matching `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_APP_URL`.
- Supabase Edge Function secret `MOBILE_APP_URL` matches the installed app scheme.
- Stripe webhook endpoint points to the matching portal environment.
- `promotion_payment_attempts` has a recent row for the promotion.
- `stripe_webhook_events.completed_at` is set only after successful processing.

Recovery:

1. Replay the Stripe webhook event from the Stripe dashboard.
2. If the promotion is stuck unpaid after a successful payment, inspect the latest payment attempt and webhook event.
3. If the refund was issued in Stripe but database update failed, update promotion/payment attempt only after confirming the Stripe refund ID.
4. Document the event ID, payment intent ID, and database changes.

## Login Fails

Symptoms:

- User cannot sign in.
- App loops back to login.
- User appears authenticated but has no profile.

Checks:

- Supabase Auth user exists in the correct project.
- `profiles.id` matches the auth user ID.
- Tenant `status` is not inactive unless intentionally suspended.
- App build points at the expected Supabase host.

Recovery:

1. Reset password from Supabase Auth or the app reset flow.
2. Restore or recreate missing profile only after matching the auth user ID.
3. For invited tenants, verify `needs_password_change` and business onboarding state.

## Push Fails

Symptoms:

- Push does not arrive.
- Admin send result shows many failures.
- In-app notifications exist but device alerts do not.

Checks:

- Device notification permission is granted.
- Profile has a current Expo push token.
- Sentry Edge events tagged `send-push-notification`.
- Expo push service response status.

Recovery:

1. Ask the user to disable and re-enable push notifications in the app.
2. Send a small test notification to one property.
3. If Edge Function logs show Expo errors, capture the ticket details and retry after confirming token freshness.

## Uploads Fail

Symptoms:

- Business logo or post image fails to upload.
- Image URL is saved but asset is missing.

Checks:

- Supabase Storage bucket `public-assets` exists.
- Storage policies allow the expected authenticated upload path.
- File size and MIME type are supported by the app flow.
- The app build points at the correct Supabase project.

Recovery:

1. Retry with a small JPG or PNG.
2. If the database row references a missing asset, remove or replace that URL.
3. Restore storage object from backup only if the asset existed previously.

## Escalation

Escalate immediately if:

- Payments are captured but promotions are not recoverable from webhook replay.
- Production Supabase appears to contain staging test data.
- Admin access is granted to the wrong property.
- A service role key, Stripe secret, webhook secret, or Sentry token is exposed.
