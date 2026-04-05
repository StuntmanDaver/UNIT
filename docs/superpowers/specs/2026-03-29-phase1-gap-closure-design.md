# Phase 1 Gap Closure — Design Spec

**Date:** 2026-03-29
**Status:** Approved
**Scope:** Single Supabase migration (`005_phase1_gap_closure.sql`)

## Problem

Phase 1 (Security & Access Control) is substantially complete but has three gaps:

1. **Audit trail is inert** — `writeAudit()` is never called anywhere. The audit_log table, AuditPage, and inline timelines exist but will always show empty.
2. **Posts and recommendations have permissive INSERT/UPDATE RLS** — Any authenticated user can create or update content attributed to any business in any property (`with check (true)`).
3. **`landlord_code` column is dead weight** — Always null, trigger-protected, no code references. Should be removed entirely.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Audit approach | Database triggers (not client-side calls) | Trust lives at the server layer; can't be bypassed or forgotten |
| RLS ownership model | Email match + property scope + landlord override | Tenants own their business content; landlords can post for any business in their properties |
| landlord_code handling | Drop column entirely | No references in code, value always null, dead schema invites confusion |
| Migration strategy | Single migration file | All three gaps are Phase 1 closure items and should ship atomically |

## Change 1: Audit Trigger Function

### Function: `audit_trigger_fn()`

A single reusable trigger function attached to all auditable tables. Declared as `SECURITY DEFINER` so it can write to `audit_log` regardless of the caller's RLS context (needed for tenant mutations on posts/recommendations).

**Table name → entity_type mapping:**

| TG_TABLE_NAME | entity_type |
|---------------|-------------|
| leases | lease |
| invoices | invoice |
| expenses | expense |
| payments | payment |
| recurring_payments | recurring_payment |
| recommendations | recommendation |
| posts | post |

**Behavior by operation:**

| Operation | action | old_value | new_value |
|-----------|--------|-----------|-----------|
| INSERT | `'created'` | null | `row_to_json(NEW)` |
| UPDATE | `'updated'` | `row_to_json(OLD)` | `row_to_json(NEW)` |
| DELETE | `'deleted'` | `row_to_json(OLD)` | null |

**Performer identification:**
- `performed_by_user_id` = `auth.uid()`
- `performed_by_email` = `auth.jwt() ->> 'email'`

### Triggers to Create

Attach `audit_trigger_fn()` as an AFTER trigger on each table:

```
audit_leases         → leases (INSERT, UPDATE, DELETE)
audit_invoices       → invoices (INSERT, UPDATE, DELETE)
audit_expenses       → expenses (INSERT, UPDATE, DELETE)
audit_payments       → payments (INSERT, UPDATE, DELETE)
audit_recurring      → recurring_payments (INSERT, UPDATE, DELETE)
audit_recommendations → recommendations (INSERT, UPDATE, DELETE)
audit_posts          → posts (INSERT, UPDATE, DELETE)
```

All triggers fire AFTER the operation and FOR EACH ROW.

### Entity ID Extraction

The trigger uses `NEW.id` for INSERT/UPDATE and `OLD.id` for DELETE as the `entity_id` value.

### Compatibility with Existing UI

The AuditPage (`src/pages/AuditPage.jsx`) filters by these entity_type values:
- `'invoice'`, `'lease'`, `'expense'`, `'payment'`, `'recurring_payment'`, `'recommendation'`

The trigger output matches these exactly. The new `'post'` type will appear in the audit log but won't show in the current AuditPage filter dropdown until it's added (not in scope for this spec).

### Impact on `writeAudit()` Client Utility

`src/lib/AuditLogger.js` becomes redundant for the 7 triggered tables. It remains in the codebase as-is — no changes needed. Future cleanup can remove it if no other use case emerges.

## Change 2: Posts & Recommendations RLS Tightening

### Helper Concept: Business Ownership Check

A row is "owned" by the current user if:
- The row's `business_id` references a business where `owner_email` = `auth.jwt() ->> 'email'`
- AND the row's `property_id` matches that business's `property_id`

A row is "landlord-accessible" if:
- The current user `is_landlord()` = true
- AND the row's `property_id` = ANY of `landlord_property_ids()`

### Posts RLS Changes

**Drop:**
- `"Users can create posts"` (INSERT, `with check (true)`)

**Create:**
- `"Business owners and landlords can create posts"` — INSERT policy:
  - `with check`: business ownership check OR landlord-accessible check
- `"Business owners and landlords can update posts"` — UPDATE policy:
  - `using`: business ownership check OR landlord-accessible check
  - `with check`: same

**Keep unchanged:**
- `"Posts are viewable by authenticated users"` — SELECT stays permissive for community visibility

### Recommendations RLS Changes

**Drop:**
- `"Users can create recommendations"` (INSERT, `with check (true)`)
- `"Users can update recommendations"` (UPDATE, `using (true)`)

**Create:**
- `"Business owners and landlords can create recommendations"` — INSERT policy:
  - `with check`: business ownership check OR landlord-accessible check
- `"Business owners and landlords can update recommendations"` — UPDATE policy:
  - `using`: business ownership check OR landlord-accessible check
  - `with check`: same

**Keep unchanged:**
- `"Recommendations are viewable by authenticated users"` — SELECT stays permissive

### Edge Cases

- **Business with no owner_email:** Cannot create posts/recommendations (no ownership match). This is correct — orphan businesses shouldn't generate content.
- **Landlord posting without a business_id:** The current schema requires `business_id` on posts and recommendations. Landlord property-wide announcements must reference a business. If landlord-only announcements are needed in the future, that's a schema change for a later phase.
- **Tenant transfers:** If a business changes `owner_email`, the new owner inherits content creation rights. Old content remains (no retroactive ownership check on SELECT).

## Change 3: Drop `landlord_code`

### Steps

1. `DROP TRIGGER no_landlord_code ON properties` — Remove the nullification trigger
2. `DROP FUNCTION prevent_landlord_code_write()` — Remove the trigger function
3. `ALTER TABLE properties DROP COLUMN landlord_code` — Remove the column

### Verification

- Zero code references to `landlord_code` (confirmed by grep across entire codebase)
- `src/services/properties.js` uses explicit column selection that already excludes it
- The column value is always null (set by migration 003)

## Migration File

**Filename:** `supabase/migrations/005_phase1_gap_closure.sql`

**Execution order within the file:**
1. Create `audit_trigger_fn()` function (SECURITY DEFINER)
2. Attach audit triggers to 7 tables
3. Drop old permissive INSERT/UPDATE policies on posts and recommendations
4. Create new ownership + landlord override policies on posts and recommendations
5. Drop `landlord_code` trigger, function, and column

## Client-Side Changes

**None required.** All changes are database-layer only.

- Audit triggers replace the need for `writeAudit()` calls — data flows automatically
- AuditPage and inline timelines will start showing data with no code changes
- Posts/recommendations forms will continue to work — the service layer already passes the correct `business_id` and `property_id`

## Testing Plan

1. **Audit triggers:**
   - Create a lease via Accounting page → verify audit_log entry appears with action='created'
   - Update the lease → verify audit_log entry with old_value and new_value
   - Delete the lease → verify audit_log entry with action='deleted'
   - Repeat for one recommendation mutation
   - Verify AuditPage displays the entries with correct filters

2. **RLS tightening:**
   - As tenant A, create a post for tenant A's business → should succeed
   - As tenant A, attempt to create a post for tenant B's business → should fail (403/RLS violation)
   - As landlord, create a post for any business in their property → should succeed
   - As landlord, attempt to create a post for a business in a property they don't own → should fail
   - Repeat pattern for recommendations

3. **landlord_code removal:**
   - Verify properties queries still work (no column reference errors)
   - Verify LandlordLogin flow still works (uses OTP, not codes)

## Success Criteria

- [ ] Audit entries appear automatically for all CRUD operations on 7 tables
- [ ] AuditPage and inline timelines display real data
- [ ] Tenants can only create/update posts for their own business
- [ ] Tenants can only create/update recommendations for their own business
- [ ] Landlords can create/update posts and recommendations for any business in their properties
- [ ] `landlord_code` column no longer exists in the schema
- [ ] All existing functionality (Accounting, LandlordRequests, Community, Recommendations pages) continues to work
