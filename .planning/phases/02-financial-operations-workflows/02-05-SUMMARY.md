---
phase: 02-financial-operations-workflows
plan: 05
subsystem: infra
tags: [supabase, edge-functions, deno, resend, email, cron, sla, invoices]

# Dependency graph
requires:
  - phase: 02-financial-operations-workflows/02-02
    provides: Invoice status lifecycle with transitionMutation in Accounting.jsx
  - phase: 02-financial-operations-workflows/02-03
    provides: SLA deadline and escalated fields on recommendations table
provides:
  - Supabase Edge Function send-invoice-email (Resend-based transactional email on invoice sent)
  - Supabase Edge Function mark-overdue-invoices (daily cron for overdue detection with audit)
  - Supabase Edge Function send-escalation-email (email to property manager on SLA breach per D-08)
  - Supabase Edge Function mark-escalated-requests (daily cron for SLA breach with escalation email)
  - Accounting.jsx wired to invoke send-invoice-email on draft->sent transition (COMM-01)
affects: [phase-03, phase-04-stripe]

# Tech tracking
tech-stack:
  added: [Supabase Edge Functions (Deno runtime), Resend API, esm.sh CDN imports]
  patterns:
    - Deno.serve handler pattern with try-catch for HTTP error responses (Edge Function convention)
    - SUPABASE_SERVICE_ROLE_KEY for RLS bypass in server-side functions
    - Fire-and-forget email invocation from client with separate error toast
    - system@cron actor in audit_log for automated writes

key-files:
  created:
    - supabase/functions/send-invoice-email/index.ts
    - supabase/functions/mark-overdue-invoices/index.ts
    - supabase/functions/mark-escalated-requests/index.ts
    - supabase/functions/send-escalation-email/index.ts
  modified:
    - src/pages/Accounting.jsx

key-decisions:
  - "try-catch is correct in Deno Edge Functions (server request handlers) — CLAUDE.md no-try-catch applies only to React component/service layer code where React Query handles errors"
  - "Email invocation in transitionMutation is fire-and-forget — email failure shows separate toast without blocking status transition toast"
  - "mark-escalated-requests invokes send-escalation-email internally via supabase.functions.invoke per D-08 (property manager email on SLA breach)"

patterns-established:
  - "Edge Function pattern: Deno.serve, Deno.env.get, createClient with service role key, CORS headers, try-catch wrapper"
  - "Audit writes in cron Edge Functions use performed_by_email: 'system@cron' and performed_by_user_id: null"

requirements-completed: [COMM-01, COMM-05]

# Metrics
duration: 3min
completed: 2026-04-03
---

# Phase 02 Plan 05: Edge Functions for Email and Cron Automation Summary

**Four Supabase Edge Functions delivering transactional email via Resend and daily cron automation for overdue invoice detection and SLA escalation — Accounting.jsx wired to send email on draft-to-sent transition**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-03T03:31:50Z
- **Completed:** 2026-04-03T03:34:45Z
- **Tasks:** 4 of 4 (Task 4 checkpoint:human-verify approved — deployment confirmed)
- **Files modified:** 5

## Accomplishments

- Created `send-invoice-email` Edge Function: fetches invoice + business + property via service_role, sends branded email via Resend with invoice number, amount, due date, and CTA link to /TenantInvoices
- Created three supporting Edge Functions: `mark-overdue-invoices` (daily cron, flips sent→overdue past due_date with audit), `send-escalation-email` (emails property managers on SLA breach per D-08), `mark-escalated-requests` (daily cron marks escalated=true and triggers escalation email)
- Wired `supabase.functions.invoke('send-invoice-email')` into `transitionMutation.onSuccess` in Accounting.jsx — fire-and-forget with separate error toast, only fires when `updated.status === 'sent'`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create send-invoice-email Edge Function** - `d2186ee` (feat)
2. **Task 2: Create mark-overdue-invoices, mark-escalated-requests, send-escalation-email Edge Functions** - `4201a5d` (feat)
3. **Task 3: Wire send-invoice-email invocation into Accounting.jsx transition flow** - `bbb2846` (feat, incorporated in parallel plan 02-04 commit)
4. **Task 4: Deploy Edge Functions and verify email delivery** - checkpoint:human-verify approved by user 2026-04-03

**Plan metadata:** `6c71c9e` docs commit (checkpoint reached), finalized after user approval

## Files Created/Modified

- `supabase/functions/send-invoice-email/index.ts` - Resend email sender for invoice notification; fetches invoice+business+property via service role; branded HTML email with #101B29 header and #465A75 accent
- `supabase/functions/mark-overdue-invoices/index.ts` - Daily cron target; finds sent invoices past due_date, updates to overdue, writes audit entry with system@cron actor
- `supabase/functions/mark-escalated-requests/index.ts` - Daily cron target; finds unresolved requests past sla_deadline, sets escalated=true, writes audit entry, invokes send-escalation-email per D-08
- `supabase/functions/send-escalation-email/index.ts` - Resend email to all landlord profiles for a property on SLA breach; [ESCALATED] subject prefix, request details table, red CTA button
- `src/pages/Accounting.jsx` - transitionMutation.onSuccess now invokes send-invoice-email on draft→sent; email errors surface as separate toast without blocking transition toast

## Decisions Made

- try-catch is appropriate in Deno Edge Functions (server request handlers) — CLAUDE.md no-try-catch convention applies to React components and service layer where React Query handles errors, not to Deno.serve handlers
- Email invocation in transitionMutation is fire-and-forget — email failure surfaces as a separate error toast but does not prevent the status transition toast from showing
- mark-escalated-requests invokes send-escalation-email for each newly escalated request per D-08 (property manager email on SLA breach)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Parallel agent (02-04) had uncommitted modifications to Accounting.jsx when Task 3 ran. Used Python string replacement to apply changes to the working tree. The parallel agent then incorporated Task 3 changes in its commit `bbb2846` — final result is correct and verified in current HEAD.

## User Setup Required

**External services require manual configuration before Edge Functions work.**

### Resend
1. Create account at resend.com
2. Go to API Keys -> Create API Key — copy the key
3. For production: Resend Dashboard -> Domains -> Add Domain (verify SPF/DKIM/DMARC DNS records)
4. For development: Use `onboarding@resend.dev` as from address (no domain verification needed)

### Supabase Secrets
1. Go to Supabase Dashboard -> Project Settings -> Edge Functions -> Secrets
2. Add `RESEND_API_KEY` with your Resend API key
3. Optional: Add `APP_URL` with your deployed app URL (e.g., `https://yourapp.com`)

### Deploy Edge Functions
```bash
npx supabase functions deploy send-invoice-email
npx supabase functions deploy mark-overdue-invoices
npx supabase functions deploy mark-escalated-requests
npx supabase functions deploy send-escalation-email
```

### Cron Scheduling (optional — for daily automation)
Enable `pg_cron` and `pg_net` extensions in Supabase Dashboard -> Database -> Extensions, then schedule:
```sql
-- Run daily at 1am UTC
select cron.schedule('mark-overdue-invoices', '0 1 * * *', $$
  select net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/mark-overdue-invoices',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
  );
$$);

select cron.schedule('mark-escalated-requests', '0 1 * * *', $$
  select net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/mark-escalated-requests',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
  );
$$);
```

## Next Phase Readiness

- COMM-01 and COMM-05 addressed: invoice email on sent transition, Resend via server-side Edge Functions
- D-03 and D-08 addressed: daily cron functions ready for deployment and scheduling
- Phase 4 Stripe webhook will be the next actor that triggers invoice status changes (D-01)
- Cron scheduling requires pg_cron/pg_net extensions enabled in Supabase Dashboard

## Self-Check: PASSED

- FOUND: supabase/functions/send-invoice-email/index.ts
- FOUND: supabase/functions/mark-overdue-invoices/index.ts
- FOUND: supabase/functions/mark-escalated-requests/index.ts
- FOUND: supabase/functions/send-escalation-email/index.ts
- FOUND commit: d2186ee (Task 1 - send-invoice-email Edge Function)
- FOUND commit: 4201a5d (Task 2 - overdue/escalation Edge Functions)
- FOUND commit: bbb2846 (Task 3 - Accounting.jsx wiring)
- Task 4 checkpoint:human-verify approved by user

---
*Phase: 02-financial-operations-workflows*
*Completed: 2026-04-03*
