# Admin Guide

This guide covers the common landlord/admin tasks in UNIT.

## Invite Tenants

1. Open the mobile app with an admin account.
2. Go to Admin Dashboard.
3. Select the target property.
4. Open Manage Tenants.
5. Invite a tenant with email, business name, category, and unit details.
6. Confirm the tenant appears as invited.
7. Tell the tenant to sign in with the temporary credentials and complete onboarding.

Notes:

- Use one property at a time.
- Do not reuse a tenant email across staging and production during testing.
- If an invite fails, open Support and send diagnostics before retrying a bulk import.

## Approve Signups

1. Open Admin Dashboard.
2. Select the property.
3. Open Manage Tenants.
4. Review pending or invited tenants.
5. Approve valid tenants, or keep inactive accounts disabled.

Check before approving:

- Business name matches the property tenant.
- Unit number is valid and not already claimed.
- Contact email belongs to the tenant.

## Manage Promotions

1. Open Admin Dashboard.
2. Select the property.
3. Open Manage Promotions or View Pending Approvals.
4. Review paid promotions first.
5. Approve, reject, request revision, suspend, or refund as needed.

Promotion rules:

- Paid promotions move to admin review through the Stripe webhook.
- Rejecting a paid promotion enables refund handling.
- Suspending a promotion should be used when approved content must be removed before expiry.
- Refunds should be documented with a clear reason.

## Send Push Notifications

1. Open Admin Dashboard.
2. Select the property.
3. Open Send Push Notification.
4. Choose the audience.
5. Write the title and message.
6. Send, then confirm the result count.

Notes:

- Push requires the tenant to grant notification permission.
- In-app notification records should still be created for targeted users.
- If delivery count is unexpectedly low, use Support to send diagnostics and check Sentry.

## Support Diagnostics

Admin Dashboard includes Support & Diagnostics. Use it when payments, login, push, or uploads fail.

It shows:

- App environment and variant.
- App version and build number.
- Deep link base.
- Supabase host.
- Sentry configuration status.
- Signed-in admin and property IDs.

Use Send Diagnostics before contacting engineering support so the failure is searchable in Sentry.
