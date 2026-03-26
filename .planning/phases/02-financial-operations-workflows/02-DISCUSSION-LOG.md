# Phase 2: Financial Operations & Workflows - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 02-financial-operations-workflows
**Areas discussed:** Invoice lifecycle, SLA & request assignment, Email notifications, CSV/PDF export

---

## Invoice Lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Landlord-only | Only property managers can move invoices through statuses. Tenants see but can't change. | ✓ |
| Landlord + tenant partial | Landlords control most, tenants can mark 'disputed' | |
| You decide | Claude picks simplest and most secure | |

**User's choice:** Landlord-only
**Notes:** Payment status updates from Stripe webhook in Phase 4

---

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase cron job | pg_cron or Edge Function runs daily, flips past-due invoices to overdue | ✓ |
| On-read calculation | UI calculates overdue at render time, no status change | |
| You decide | Claude picks | |

**User's choice:** Supabase cron job

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — tenant invoice page | Tenants see invoices linked to their business, read-only | ✓ |
| No — landlord only for now | Invoices only on Accounting page | |
| You decide | Claude picks | |

**User's choice:** Yes — tenant invoice page

---

| Option | Description | Selected |
|--------|-------------|----------|
| Strict linear | draft → sent → paid (or overdue → paid). Void from any non-paid. No backwards. | ✓ |
| Flexible with guardrails | Allow some backwards movement (sent → draft) | |
| You decide | Claude picks | |

**User's choice:** Strict linear

---

## SLA & Request Assignment

| Option | Description | Selected |
|--------|-------------|----------|
| Landlord assigns manually | Landlord picks assignee from request detail view | ✓ |
| Auto-assign by category | Auto-route to predefined staff per category | |
| You decide | Claude picks | |

**User's choice:** Landlord assigns manually

---

| Option | Description | Selected |
|--------|-------------|----------|
| Calendar days by priority | Low=7d, Medium=3d, High=1d from submission | ✓ |
| Business hours by priority | Same tiers counted in business hours | |
| You decide | Claude picks | |

**User's choice:** Calendar days by priority

---

| Option | Description | Selected |
|--------|-------------|----------|
| Visual flag + email | Escalated badge, top of list, email to property manager | ✓ |
| Visual flag only | Just a red badge, no email | |
| You decide | Claude picks | |

**User's choice:** Visual flag + email

---

| Option | Description | Selected |
|--------|-------------|----------|
| Status only, no SLA details | Tenants see status + assignee, not SLA deadline or escalation | ✓ |
| Full transparency | Tenants see target date and escalation state | |
| You decide | Claude picks | |

**User's choice:** Status only, no SLA details

---

## Email Notifications

| Option | Description | Selected |
|--------|-------------|----------|
| Invoice generated/sent | Tenant email on new invoice | ✓ |
| Request status change | Tenant email on request status move | |
| SLA 80% warning | Landlord email at 80% of SLA deadline | |
| SLA breach / escalation | Landlord email on SLA breach | |

**User's choice:** Invoice generated/sent only
**Notes:** All other email triggers deferred. Request status changes and SLA events use in-app notifications only.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase Edge Function + Resend | Edge Function calls Resend API, server-side | ✓ |
| Supabase Database Webhooks + Resend | DB triggers fire webhooks | |
| You decide | Claude picks | |

**User's choice:** Supabase Edge Function + Resend

---

| Option | Description | Selected |
|--------|-------------|----------|
| Summary + in-app link | Invoice number, amount, due date, link to view in-app | ✓ |
| Summary + PDF attachment | Same plus attached PDF | |
| You decide | Claude picks | |

**User's choice:** Summary + in-app link

---

## CSV/PDF Export

| Option | Description | Selected |
|--------|-------------|----------|
| Invoices list | Export invoices as CSV/PDF table | ✓ |
| Leases list | Export leases with tenant, unit, dates | ✓ |
| Expenses list | Export expenses with date, category, amount | |
| Financial summary report | Export FinancialReports view as formatted PDF | ✓ |

**User's choice:** Invoices, Leases, Financial summary (not Expenses)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Both CSV + PDF | CSV for data, PDF for sharing | ✓ |
| CSV only | Simpler scope | |
| You decide | Claude picks | |

**User's choice:** Both CSV + PDF

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — branded PDF | UNIT logo, brand colors, property name | ✓ |
| Plain — data only | Clean data tables, no branding | |
| You decide | Claude picks | |

**User's choice:** Yes — branded PDF

---

## Claude's Discretion

- Invoice status transition enforcement mechanism
- Cron job implementation approach
- SLA deadline calculation trigger timing
- Email template design
- CSV generation approach
- PDF layout with jsPDF
- Tenant invoice page navigation placement

## Deferred Ideas

- Email for request status changes (in-app only for now)
- Email for SLA 80% warning
- Email for SLA breach (visual flag only)
- Expenses list export
- Auto-assignment by category
- Business-hours SLA calculation
- Invoice PDF attachment in email
