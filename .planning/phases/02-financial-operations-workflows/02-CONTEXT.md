# Phase 2: Financial Operations & Workflows - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Invoices follow a tracked lifecycle (draft → sent → paid → overdue → void) with an audit trail. Requests have SLA-governed assignment and escalation. Key events trigger transactional email. Accounting data is exportable as CSV and formatted PDF.

</domain>

<decisions>
## Implementation Decisions

### Invoice Lifecycle
- **D-01:** Landlord-only status transitions. Tenants see invoices read-only but cannot change status. Phase 4 Stripe webhook will be the only non-landlord actor that updates invoice status.
- **D-02:** Strict linear transitions: draft → sent → paid (or overdue → paid). Void allowed from any non-paid state. No backwards movement (e.g., sent → draft not allowed).
- **D-03:** Overdue detection via Supabase cron job (pg_cron or Edge Function). Runs daily, finds invoices past `due_date` still in `sent` status, flips to `overdue`, logs audit entry.
- **D-04:** Tenants get a read-only invoice page showing invoices linked to their business — status, amount, due date. This sets up cleanly for Phase 4 "Pay Invoice" button.
- **D-05:** Every status transition is recorded in the AuditLog table (from Phase 1: D-12 through D-15) — actor, timestamp, old status, new value.

### SLA & Request Assignment
- **D-06:** Landlord assigns requests manually from the request detail view. Assignee is another property manager or a staff name/email. No auto-assignment by category.
- **D-07:** SLA deadlines calculated in calendar days by priority: Low = 7 days, Medium = 3 days, High = 1 day from submission. No business-hours complexity for v1.
- **D-08:** On SLA breach: request gets an 'escalated' badge in the UI, moves to top of landlord's request list, and triggers an email to the property manager.
- **D-09:** Tenants see request status (submitted/in progress/resolved) and assignee name, but NOT the SLA deadline or escalation state.
- **D-10:** New columns needed on `recommendations` table: `assigned_to` (text/email), `sla_deadline` (timestamptz), `escalated` (boolean, default false).

### Email Notifications
- **D-11:** Only one email trigger for this phase: invoice generated/sent. Email goes to the tenant business's `owner_email` when an invoice moves to `sent` status.
- **D-12:** Email content: invoice number, amount, due date, and a link to view the invoice in-app. No PDF attachment.
- **D-13:** Sent via Supabase Edge Function calling Resend API. Server-side only — no client-side email sending.
- **D-14:** Request status changes and SLA warnings do NOT trigger email in this phase — in-app notifications only for those events.

### CSV/PDF Export
- **D-15:** Exportable data: invoices list, leases list, and financial summary report. Expenses list deferred.
- **D-16:** Both CSV and PDF formats supported. CSV for data analysis, PDF for sharing/printing.
- **D-17:** PDF exports are branded — UNIT logo header, brand navy/steel-blue accents, property name.
- **D-18:** Export controls live on the Accounting page, accessible to landlords only.

### Claude's Discretion
- Invoice status transition enforcement approach (database trigger vs. service-layer validation vs. Edge Function)
- Cron job implementation details (pg_cron vs. scheduled Edge Function)
- SLA deadline calculation trigger (on insert vs. on assignment)
- Email template design and Resend SDK usage
- CSV generation library choice (or vanilla JS)
- PDF layout and table formatting with jsPDF
- Tenant invoice page placement in navigation

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Security & Auth (Phase 1 decisions that constrain this phase)
- `.planning/phases/01-security-access-control/01-CONTEXT.md` — D-12 through D-15 define audit trail requirements. D-03 defines profiles table structure for property manager lookups.
- `specs/2026-03-26-security-hardening-design.md` — RLS policies for financial tables, property_managers table schema, landlord session pattern

### Existing Financial Code (must read before modifying)
- `src/pages/Accounting.jsx` — Current 693-line accounting page with tabs, modals, and CRUD for all financial entities
- `src/components/accounting/InvoiceModal.jsx` — Invoice create/edit form with status field
- `src/components/accounting/FinancialReports.jsx` — Summary reports view (export target)
- `src/components/accounting/LeaseModal.jsx` — Lease create/edit form
- `src/services/accounting.js` — Generic CRUD factory for all 5 financial tables
- `src/services/recommendations.js` — Request service (needs assignment/SLA fields)
- `src/services/notifications.js` — In-app notification service (reference pattern for email triggers)

### Database Schema
- `supabase/migrations/001_initial_schema.sql` — Current schema for invoices, leases, expenses, recurring_payments, payments, recommendations, notifications tables

### Request Management
- `src/pages/LandlordRequests.jsx` — Landlord request management page (assignment UI goes here)
- `src/pages/Recommendations.jsx` — Tenant request submission and status view

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `accounting.js` CRUD factory: Generic `createAccountingService(tableName)` pattern — extend for lifecycle-aware operations
- `InvoiceModal.jsx`: Already has status field, invoice number generation, lease linkage — needs transition logic added
- `FinancialReports.jsx`: Existing summary view — export target for PDF
- `jsPDF` + `html2canvas`: Already in `package.json` dependencies — ready for PDF generation
- `notificationsService`: Pattern for creating notification records — reference for email trigger points
- shadcn/ui `Badge`, `Tabs`, `Card`: All used in Accounting page — reuse for SLA badges and tenant invoice view

### Established Patterns
- **Data fetching**: TanStack Query with service layer functions, keyed by `['entity', propertyId]`
- **Modal CRUD**: Controlled Dialog components accepting `isOpen/onClose/onSubmit` props
- **Tab navigation**: URL param `?tab=X` pattern used in Accounting page
- **Brand styling**: Tailwind with `brand-navy`, `brand-slate` tokens + gradient classes

### Integration Points
- `Accounting.jsx`: Invoice tab needs status transition buttons, export buttons
- `LandlordRequests.jsx`: Needs assignment UI and SLA badge display
- `Recommendations.jsx`: Needs status + assignee display (no SLA details)
- `supabase/migrations/`: New migration for recommendations columns (assigned_to, sla_deadline, escalated)
- `supabase/functions/`: New Edge Functions for email sending and overdue cron
- Navigation: Tenant invoice page needs a new route and nav entry

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for all implementation details.

</specifics>

<deferred>
## Deferred Ideas

- **Email for request status changes (COMM-02)** — deferred per D-14. In-app notifications cover this for now.
- **Email for SLA 80% warning (REQ-04)** — deferred per D-14. Only breach/escalation triggers action.
- **Lease expiry email warnings (COMM-03)** — deferred. Not in Phase 2 scope; candidate for Phase 4.
- **Payment received email (COMM-04)** — deferred to Phase 4 (Stripe webhook flow).
- **Configurable SLA targets (REQ-02)** — deferred per D-07. v1 uses hardcoded calendar-day constants (High=1d, Medium=3d, Low=7d). Configurable targets are a future enhancement.
- **Business-hours SLA calculation (REQ-03)** — deferred per D-07. Calendar days chosen for v1 simplicity.
- **Expenses list export** — invoices, leases, and summary report prioritized over expenses export.
- **Auto-assignment by category** — manual assignment chosen for v1 simplicity.
- **Invoice PDF attachment in email** — summary + in-app link chosen for simplicity.

</deferred>

---

*Phase: 02-financial-operations-workflows*
*Context gathered: 2026-03-26*
*Deferred section updated: 2026-03-30 (checker revision — added REQ-02, REQ-03, COMM-02, COMM-03, COMM-04, REQ-04 with decision references; removed "Email for SLA breach" per D-08 confirmation)*
