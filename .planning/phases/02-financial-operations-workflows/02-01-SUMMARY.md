---
phase: 02-financial-operations-workflows
plan: 01
subsystem: service-layer
tags: [database, migrations, accounting, recommendations, sla, audit]
dependency_graph:
  requires: []
  provides: [migration-005, transitionInvoiceStatus, ALLOWED_TRANSITIONS, getSlaDeadline, SLA_DAYS]
  affects: [src/services/accounting.js, src/services/recommendations.js, src/lib/sla.js, supabase/migrations/005_financial_workflows.sql]
tech_stack:
  added: [date-fns/addDays]
  patterns: [invoice-state-machine, sla-deadline-calculator, audit-trail-on-mutation]
key_files:
  created:
    - supabase/migrations/005_financial_workflows.sql
    - src/lib/sla.js
  modified:
    - src/services/accounting.js
    - src/services/recommendations.js
decisions:
  - "Invoice status transitions enforce a strict state machine via ALLOWED_TRANSITIONS — invalid transitions throw synchronously before any DB write"
  - "Audit writes after invoice status change use .catch(() => {}) to ensure audit failures never block the primary mutation"
  - "SLA deadline defaults to medium (3 days) when priority is unrecognized — safe fallback per D-07"
  - "Tenant invoice RLS uses owner_email match against businesses table — read-only (no INSERT/UPDATE/DELETE per D-01)"
metrics:
  duration_minutes: 2
  completed_date: "2026-04-03"
  tasks_completed: 3
  files_changed: 4
---

# Phase 02 Plan 01: Financial Operations Foundation Summary

## One-liner

DB migration with SLA/assignment columns on recommendations, cron indexes, tenant invoice RLS, plus invoice state-machine guard and SLA deadline calculator in the service layer.

## What Was Built

### Task 1: Migration 005 — SLA columns, indexes, tenant invoice RLS

`supabase/migrations/005_financial_workflows.sql` — Three sections:

1. **SLA/assignment columns on recommendations** — `assigned_to text`, `sla_deadline timestamptz`, `escalated boolean NOT NULL DEFAULT false`
2. **Cron performance indexes** — `idx_recommendations_escalated`, `idx_recommendations_sla_deadline`, `idx_invoices_status_due ON invoices(status, due_date)`
3. **Tenant invoice RLS** — `"Tenants can view own invoices"` FOR SELECT matching `owner_email = auth.jwt()->>'email'` via businesses subquery. No INSERT/UPDATE/DELETE for tenants (D-01).

### Task 2: transitionInvoiceStatus + SLA utility

`src/lib/sla.js` — New utility:
- `SLA_DAYS = { high: 1, medium: 3, low: 7 }` — priority-to-calendar-days map
- `getSlaDeadline(priority)` — returns ISO datetime N days from now (defaults to 3 if unknown priority)

`src/services/accounting.js` — Enhanced:
- Added `import { writeAudit } from '@/lib/AuditLogger'`
- Added `export const ALLOWED_TRANSITIONS` — state machine map (paid and void are terminal states)
- Added `export async function transitionInvoiceStatus(invoiceId, newStatus, { userId, userEmail })` — fetches current status, validates against ALLOWED_TRANSITIONS, updates DB, fires audit log with `.catch(() => {})`

### Task 3: SLA-aware recommendations creation

`src/services/recommendations.js` — Modified `create()` method:
- Imports `getSlaDeadline` from `@/lib/sla`
- Spreads `recData` then injects `sla_deadline: getSlaDeadline(recData.priority)` and `escalated: false`
- All five other service exports (`leasesService`, `recurringPaymentsService`, `invoicesService`, `expensesService`, `paymentsService`) remain unchanged

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | b0e7433 | feat(02-01): create migration 005 with SLA columns, indexes, and tenant invoice RLS |
| 2 | c5577e4 | feat(02-01): add transitionInvoiceStatus to accounting service and create SLA utility |
| 3 | d56f24c | feat(02-01): enhance recommendations service with SLA-aware creation |

## Known Stubs

None — all service layer logic is fully wired. Migration columns exist and are consumed by recommendations.create(). The transitionInvoiceStatus function is production-ready but not yet called from any UI component — that wiring is the responsibility of downstream plans in this phase.

## Self-Check

- FOUND: supabase/migrations/005_financial_workflows.sql
- FOUND: src/lib/sla.js
- FOUND: src/services/accounting.js
- FOUND: src/services/recommendations.js
- FOUND: .planning/phases/02-financial-operations-workflows/02-01-SUMMARY.md
- FOUND commit: b0e7433 (migration 005)
- FOUND commit: c5577e4 (accounting service + sla.js)
- FOUND commit: d56f24c (recommendations service)

## Self-Check: PASSED
