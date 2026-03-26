---
phase: 01-security-access-control
plan: "01"
subsystem: auth-database
tags: [supabase, rls, profiles, auth-context, security, audit-log]
dependency_graph:
  requires: []
  provides: [profiles-table, is-landlord-fn, landlord-property-ids-fn, financial-rls, audit-log, auth-context-role]
  affects: [src/lib/AuthContext.jsx, supabase/migrations/003_landlord_auth.sql]
tech_stack:
  added: []
  patterns: [supabase-rls, security-definer-fn, append-only-audit-log, auth-context-profile-fetch]
key_files:
  created:
    - supabase/migrations/003_landlord_auth.sql
  modified:
    - src/lib/AuthContext.jsx
decisions:
  - "Use security definer helper functions (is_landlord, landlord_property_ids) to avoid repeating subqueries across 20+ RLS policies"
  - "Graceful fallback to tenant role in AuthContext if profiles table query fails — backward-compatible during transition"
  - "Payments table gets all 4 RLS policies (select/insert/update/delete) for consistency with other financial tables, despite original schema only having 2"
metrics:
  duration: ~15 minutes
  completed: "2026-03-26"
  tasks_completed: 2
  files_modified: 2
---

# Phase 1 Plan 1: Database Foundation & AuthContext Extension Summary

Supabase profiles table with landlord role and property_ids array, property-scoped financial RLS replacing all placeholder policies, audit_log table with append-only enforcement, landlord_code field neutralization, and AuthContext extension exposing isLandlord + propertyIds via useAuth hook.

## What Was Built

### Migration 003_landlord_auth.sql

A 6-section SQL migration that establishes the server-side auth foundation:

1. **profiles table** — Linked to `auth.users` via UUID primary key. Stores `role` (tenant/landlord with check constraint), `property_ids` (uuid[]), `email`, and `created_at`. RLS: users can read their own row; service role can manage all rows.

2. **is_landlord() helper function** — `security definer stable` SQL function that returns `true` only when `auth.uid()` has `role = 'landlord'` in profiles. Used in all 20 financial RLS policies.

3. **landlord_property_ids() helper function** — `security definer stable` SQL function returning the current landlord's `property_ids` array. Returns empty array for non-landlords via `coalesce`. This is the AUTH-03 isolation mechanism — a landlord with property A cannot access property B's financial records.

4. **Financial table RLS replacement** — Dropped all 18 placeholder `using (true)` policies from 001_initial_schema.sql across 5 tables (leases, recurring_payments, invoices, expenses, payments). Replaced with 20 property-scoped policies requiring BOTH `is_landlord()` AND `property_id = any(landlord_property_ids())`.

5. **landlord_code neutralization** — NULLs all existing landlord_code values on properties table and adds a `BEFORE INSERT OR UPDATE` trigger (`no_landlord_code`) that prevents future writes to the field.

6. **audit_log table** — Append-only table with `entity_type`, `entity_id`, `action`, `old_value` (jsonb), `new_value` (jsonb), `performed_by_user_id`, `performed_by_email`, `performed_at`. RLS allows landlords to INSERT and SELECT only — no UPDATE or DELETE policies exist.

### AuthContext.jsx Extension

Extended with profile-aware auth state:

- Added `userRole` and `propertyIds` state variables
- Added `fetchUserProfile(userId)` — queries `profiles` table, defaults to `role='tenant'` and `propertyIds=[]` on error (graceful fallback)
- `onAuthStateChange` callback now calls `fetchUserProfile` when session is established; clears role state on sign-out
- `checkAppState` also calls `fetchUserProfile` for page-load session restoration
- `logout()` now clears `userRole` and `propertyIds` before signing out
- `isLandlord` derived as `userRole === 'landlord'`
- Context value now exports: `isLandlord`, `userRole`, `propertyIds` alongside all existing values

## Deviations from Plan

### Auto-fixed Issues

None.

### Plan Deviations

**1. Payments table gets 4 policies instead of 2**

The original 001_initial_schema.sql only had 2 policies for the payments table ("Payments viewable" and "Payments writable"). The plan's acceptance criteria specified 18 drop statements (matching those 18 existing policies), but Section 4 of the action said to add all 4 policies for consistency. We dropped the original 2 and added 4 replacement policies (select, insert, update, delete). This aligns with the plan's stated intent ("add all 4 for consistency") and provides complete landlord-scoped control over payment records.

## Known Stubs

None. This plan creates database artifacts and extends an auth context — no UI rendering is involved, so no stubs are possible.

## Self-Check: PASSED

- `supabase/migrations/003_landlord_auth.sql` exists and contains all 6 sections ✓
- `src/lib/AuthContext.jsx` exports `isLandlord`, `userRole`, `propertyIds` ✓
- Commit `c4f7aa4` (migration) exists ✓
- Commit `2595dc0` (AuthContext) exists ✓
