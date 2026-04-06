# Edge Functions

All Edge Functions live in `supabase/functions/`. They are Deno-based TypeScript functions deployed to Supabase's Edge runtime.

The four active functions used in production are documented here. Additional functions exist in the repo (`mark-escalated-requests`, `mark-overdue-invoices`, `send-escalation-email`, `send-invoice-email`) but are not currently wired to active app flows.

---

## invite-tenant

**Path:** `supabase/functions/invite-tenant/`

**Trigger:** Admin action — POST request from the landlord's tenant import UI.

**Auth:** Requires landlord role. The calling client must supply a valid JWT for a user with `role = 'landlord'`.

### Input

```json
{
  "tenants": [
    {
      "email": "tenant@example.com",
      "business_name": "Acme Bakery",
      "category": "Food & Beverage",
      "contact_name": "Jane Smith",
      "contact_phone": "+1-555-0100",
      "services": "Fresh bread, pastries",
      "description": "Artisan bakery since 2010",
      "property_id": "uuid-of-property"
    }
  ]
}
```

Fields `contact_name`, `contact_phone`, `services`, and `description` are optional.

### Process

For each tenant in the array (processed sequentially):

1. Validate required fields (`email`, `business_name`, `category`, `property_id`).
2. Check if a user with that email already exists in auth.
3. Generate a temporary password.
4. Create a Supabase auth user via the service role client.
5. Insert a profile record with `status = 'invited'`.
6. Insert a business record linked to the profile and property.
7. Send an invitation email via Resend with login credentials and onboarding link.

### Output

```json
{
  "imported": 3,
  "failed": [
    { "email": "bad@example.com", "reason": "User already exists" }
  ],
  "total": 4
}
```

### Notes

- Processing is sequential per tenant to avoid race conditions on auth user creation.
- A partial success is possible — `imported + failed.length` equals `total`.
- Failures do not roll back previously imported tenants.

---

## complete-onboarding

**Path:** `supabase/functions/complete-onboarding/`

**Trigger:** Self-registering tenant completes the onboarding flow — POST request from the tenant onboarding screen.

**Auth:** Requires any authenticated user (JWT present). The function operates on the calling user's own profile.

### Input

```json
{
  "property_id": "uuid-of-property"
}
```

### Process

1. Extracts the user ID from the JWT.
2. Uses the service role client (bypasses RLS) to update the user's profile:
   - Sets `property_ids = [property_id]`
   - Sets `status = 'active'`
   - Sets `activated_at = now()`

### Output

```json
{
  "success": true
}
```

### Notes

- Using the service role is necessary here because RLS prevents users from writing to `property_ids` directly.
- This is the terminal step of tenant self-registration; after this call the tenant has full app access.

---

## add-property-to-admin

**Path:** `supabase/functions/add-property-to-admin/`

**Trigger:** Admin creates a new property — POST request from the property creation flow.

**Auth:** Requires landlord role.

### Input

```json
{
  "property_id": "uuid-of-new-property"
}
```

### Process

1. Extracts the admin user ID from the JWT.
2. Checks if `property_id` is already present in the admin's `property_ids` array (prevents duplicates).
3. Uses the service role client to append `property_id` to the admin's `property_ids` array.

### Output

```json
{
  "success": true
}
```

### Notes

- The duplicate check makes this call idempotent — safe to retry on network failure.
- Uses `array_append` semantics on the Postgres array column.

---

## send-push-notification

**Path:** `supabase/functions/send-push-notification/`

**Trigger:** Post/offer creation, advertiser approval, or admin broadcast — POST request from any of these flows.

**Auth:** Requires any authenticated user (JWT present).

### Input

```json
{
  "property_id": "uuid-of-property",
  "title": "New deal from Acme Bakery",
  "message": "50% off pastries today only!",
  "data": { "type": "offer" },
  "audience": "all",
  "exclude_email": "sender@example.com"
}
```

- `data` — optional extra payload forwarded in the push notification (used for deep linking, specifically `data.type`).
- `audience` — optional filter (`"all"` or `"active"`).
- `exclude_email` — optional email to exclude from recipients (e.g. the sender).

### Process

1. Queries all profiles associated with `property_id` that have a non-null `push_token`.
2. Applies `audience` (e.g. `status = 'active'`) and `exclude_email` filters.
3. Batches recipients into groups of 100 and sends each batch to the Expo Push API.
4. Inserts a notification record in the `notifications` table for every recipient regardless of push delivery status.

### Output

```json
{
  "sent": 42,
  "failed": 2,
  "total": 44
}
```

### Notes

- The 100-per-batch limit follows the Expo Push API constraint.
- Notification records are inserted even when push delivery fails, so in-app notification history remains complete.
- `data.type` payload should conform to the app's navigation scheme for deep link routing to work correctly.