# Backup and Recovery

This guide describes expected recovery paths. Test these in staging before launch.

## Supabase Database Restore

Minimum expectation:

- Production backups are enabled.
- The client knows the recovery point objective available on their Supabase plan.
- Restore is tested into a non-production project first.

Test procedure:

1. Create a staging backup or select a recent restore point.
2. Restore into a temporary Supabase project.
3. Run application smoke checks against the restored project.
4. Compare row counts for core tables:
   - `profiles`
   - `businesses`
   - `properties`
   - `posts`
   - `promotions`
   - `promotion_payment_attempts`
   - `stripe_webhook_events`
5. Delete the temporary restore project after evidence is captured.

## Migration Rollback Strategy

Preferred strategy:

- Roll forward with a corrective migration.
- Avoid editing already-applied migration files.
- Test rollback drills in staging by restoring a backup, then applying the corrective migration.

Before applying production migrations:

1. Apply to staging.
2. Run database tests.
3. Run app smoke tests.
4. Record migration filenames and Supabase project ref.
5. Confirm a restore point exists.

If production migration fails:

1. Stop deployments.
2. Capture the exact migration error.
3. Do not run ad hoc manual SQL unless approved.
4. Restore to a temporary project to inspect state.
5. Create and review a corrective migration.

## Storage Recovery

Storage is used for public assets such as logos, post images, and promotion images.

Expectations:

- Database backups do not automatically prove object recovery.
- Store object recovery expectations by bucket and Supabase plan.
- Keep image URLs replaceable from admin or support workflows.

Recovery:

1. Confirm whether the object ever existed in `public-assets`.
2. If the database row points at a missing object, re-upload or clear the URL.
3. If available, restore the object from provider backup or a temporary restored project.
4. Record the object path and affected database rows.

## Stripe Webhook Replay

Use replay when Stripe succeeded but UNIT did not update.

1. Open the Stripe dashboard for the correct environment.
2. Find the payment intent, checkout session, or webhook event.
3. Confirm the webhook endpoint belongs to the same environment.
4. Replay the event.
5. Watch portal logs and Sentry.
6. Confirm `stripe_webhook_events.completed_at` is set after successful processing.
7. Confirm promotion and payment attempt statuses.

Never replay staging events into production or production events into staging.

## Recover a Stuck Promotion or Payment

Common stuck states:

- Stripe paid but promotion is still unpaid.
- Promotion paid but review status is not pending.
- Refund issued but promotion is not marked refunded.
- Revision was resubmitted but status did not return to pending.

Recovery order:

1. Check Stripe first. Stripe is the source of truth for money movement.
2. Check `promotion_payment_attempts` for the latest attempt.
3. Check `stripe_webhook_events` for webhook completion.
4. Replay the Stripe webhook if the event exists and was not completed.
5. Use admin actions where available.
6. Only perform manual database correction after documenting:
   - Promotion ID
   - Stripe checkout session ID
   - Payment intent ID
   - Webhook event ID
   - Operator name
   - Reason

After recovery, create a note in the incident log and verify the tenant/admin UI state.
