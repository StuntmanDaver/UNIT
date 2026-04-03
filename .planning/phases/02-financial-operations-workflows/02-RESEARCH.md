# Phase 02: Financial Operations & Workflows - Research

**Researched:** 2026-03-30
**Domain:** Invoice lifecycle, SLA workflows, transactional email, CSV/PDF export — all within existing Supabase/React stack
**Confidence:** HIGH (primary research verified against existing codebase; external patterns verified against official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Invoice Lifecycle**
- D-01: Landlord-only status transitions. Tenants see invoices read-only but cannot change status. Phase 4 Stripe webhook will be the only non-landlord actor that updates invoice status.
- D-02: Strict linear transitions: draft → sent → paid (or overdue → paid). Void allowed from any non-paid state. No backwards movement (e.g., sent → draft not allowed).
- D-03: Overdue detection via Supabase cron job (pg_cron or Edge Function). Runs daily, finds invoices past `due_date` still in `sent` status, flips to `overdue`, logs audit entry.
- D-04: Tenants get a read-only invoice page showing invoices linked to their business — status, amount, due date. This sets up cleanly for Phase 4 "Pay Invoice" button.
- D-05: Every status transition is recorded in the AuditLog table (from Phase 1: D-12 through D-15) — actor, timestamp, old status, new status.

**SLA & Request Assignment**
- D-06: Landlord assigns requests manually from the request detail view. Assignee is another property manager or a staff name/email. No auto-assignment by category.
- D-07: SLA deadlines calculated in calendar days by priority: Low = 7 days, Medium = 3 days, High = 1 day from submission. No business-hours complexity for v1.
- D-08: On SLA breach: request gets an 'escalated' badge in the UI, moves to top of landlord's request list, and triggers an email to the property manager.
- D-09: Tenants see request status (submitted/in progress/resolved) and assignee name, but NOT the SLA deadline or escalation state.
- D-10: New columns needed on `recommendations` table: `assigned_to` (text/email), `sla_deadline` (timestamptz), `escalated` (boolean, default false).

**Email Notifications**
- D-11: Only one email trigger for this phase: invoice generated/sent. Email goes to the tenant business's `owner_email` when an invoice moves to `sent` status.
- D-12: Email content: invoice number, amount, due date, and a link to view the invoice in-app. No PDF attachment.
- D-13: Sent via Supabase Edge Function calling Resend API. Server-side only — no client-side email sending.
- D-14: Request status changes and SLA warnings do NOT trigger email in this phase — in-app notifications only for those events.

**CSV/PDF Export**
- D-15: Exportable data: invoices list, leases list, and financial summary report. Expenses list deferred.
- D-16: Both CSV and PDF formats supported. CSV for data analysis, PDF for sharing/printing.
- D-17: PDF exports are branded — UNIT logo header, brand navy/steel-blue accents, property name.
- D-18: Export controls live on the Accounting page, accessible to landlords only.

### Claude's Discretion
- Invoice status transition enforcement approach (database trigger vs. service-layer validation vs. Edge Function)
- Cron job implementation details (pg_cron vs. scheduled Edge Function)
- SLA deadline calculation trigger (on insert vs. on assignment)
- Email template design and Resend SDK usage
- CSV generation library choice (or vanilla JS)
- PDF layout and table formatting with jsPDF
- Tenant invoice page placement in navigation

### Deferred Ideas (OUT OF SCOPE)
- Email for request status changes — in-app notifications only for now
- Email for SLA 80% warning — only breach/escalation triggers email
- Email for SLA breach — visual flag + top of list, no email in this phase
- Expenses list export — invoices, leases, and summary report prioritized
- Auto-assignment by category — manual assignment chosen for v1
- Business-hours SLA calculation — calendar days chosen for v1
- Invoice PDF attachment in email — summary + in-app link chosen for simplicity
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FIN-01 | Invoices follow a status lifecycle (draft → sent → paid → overdue → void) with enforced transition rules | D-02 defines allowed transitions; service-layer guard pattern identified; existing `invoicesService` in accounting.js is the extension point |
| FIN-02 | All financial record mutations (invoice, payment, expense, lease) are logged to an append-only AuditLog entity | `writeAudit()` in `src/lib/AuditLogger.js` already exists; `audit_log` table created in migration 003; pattern is to call after each mutation |
| FIN-03 | All request status changes are logged to the AuditLog entity | Same `writeAudit()` pattern; `LandlordRequests.jsx` already invalidates `audit_log` query on status update — just needs the write call |
| FIN-04 | Accounting reports can be exported as CSV | Vanilla JS `exportCSV` already implemented in `FinancialReports.jsx` — needs extension to invoices and leases tabs |
| FIN-05 | Accounting reports can be exported as PDF with formatted layout | `jspdf` 4.0.0 already installed; `jspdf-autotable` 5.0.7 (compatible with jsPDF 4.x) needs to be added; branded PDF generation pattern documented below |
| REQ-01 | Recommendations/requests support an assigned_to field for staff/contractor assignment | New column `assigned_to text` on `recommendations` table; UI in `LandlordRequests.jsx`; visible (read-only) on `Recommendations.jsx` |
| REQ-02 | Recommendations/requests have SLA target hours configurable by request type | D-07 overrides: calendar days by priority. No separate config table needed — hardcoded constants: High=1d, Medium=3d, Low=7d |
| REQ-03 | SLA deadlines are calculated using business-hours awareness (not calendar hours) | D-07 explicitly defers business-hours to future; calendar days are the implementation for this phase |
| REQ-04 | Landlord receives email notification when an SLA deadline is at 80% elapsed | D-14 explicitly defers this to future phase — NOT in scope |
| REQ-05 | Requests are flagged as escalated when SLA deadline passes without resolution | New column `escalated boolean default false` on `recommendations`; daily cron checks `sla_deadline < now()` and sets `escalated = true` |
| COMM-01 | Transactional email sent when an invoice is generated for a tenant | Edge Function `send-invoice-email` triggered by service layer when invoice status moves to `sent` |
| COMM-02 | Transactional email sent when a request status changes | D-14: OUT OF SCOPE this phase — in-app notifications only |
| COMM-03 | Transactional email sent for lease expiry warnings (30 and 7 days) | Not mentioned in CONTEXT.md decisions — DEFERRED; not in Phase 2 scope per CONTEXT.md |
| COMM-04 | Transactional email sent when a payment is received | Not in CONTEXT.md decisions — DEFERRED to Phase 4 (Stripe payment confirmation) |
| COMM-05 | Email delivery uses Resend (via Supabase Edge Functions or direct integration) with proper DNS authentication | D-13 confirmed: Resend API via Edge Function. DNS auth requires verified domain in Resend dashboard before first production send |
</phase_requirements>

---

## Summary

Phase 2 operates entirely within the existing Supabase/React stack — no new backend infrastructure is needed beyond Supabase Edge Functions (Deno runtime) and the Resend email API. The codebase already has most primitives: `writeAudit()` exists, `audit_log` is created in migration 003, `jspdf` is already installed at 4.0.0, the `exportCSV` function exists in `FinancialReports.jsx`, and `AuditLogTimeline` is already rendering audit entries in both the Accounting and Requests pages.

The three substantial pieces of new work are: (1) invoice status transition enforcement and the UI to drive transitions, (2) recommendations table augmentation with SLA/assignment columns plus the daily cron job to mark escalated records, and (3) the `send-invoice-email` Edge Function calling Resend. Export extension (FIN-04, FIN-05) is additive work on existing UI — low risk.

**Primary recommendation:** Build all database changes as a single migration 005; add the Edge Function and cron job as separate supabase function files; extend service-layer methods for lifecycle-aware invoice updates; add audit writes to existing mutation handlers. Avoid database triggers for status transitions — service-layer enforcement is simpler, testable, and consistent with existing project patterns.

---

## Project Constraints (from CLAUDE.md)

These directives are extracted from CLAUDE.md and must be honored by all plans:

- Tech stack is locked: Supabase BaaS (no custom backend), React 18, Vite, Tailwind CSS, TanStack Query, Radix UI
- Brownfield project: preserve all existing functionality while adding new features
- All internal imports use `@/` prefix
- Components in PascalCase `.jsx`, utilities in camelCase `.js` / `.ts`
- Service layer functions at `src/services/` — thin wrappers over Supabase client calls
- TanStack Query for all server state: `useQuery` / `useMutation` with `queryClient.invalidateQueries` on success
- `writeAudit()` calls must use `.catch(() => {})` so audit failures never block primary mutations
- No try-catch blocks — React Query handles async errors; service layer throws on Supabase errors
- CSS uses Tailwind with brand tokens: `brand-navy`, `brand-slate`, `brand-steel`, `brand-gray`
- Brand gradient: `bg-gradient-to-r from-brand-slate to-brand-navy` for primary buttons
- Navigation via `useNavigate()` from React Router 6
- No prop-types (disabled in eslint config); no TypeScript in .jsx files

---

## Standard Stack

### Core (already installed — no new packages for most features)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| jspdf | 4.0.0 | PDF generation client-side | Already in package.json |
| html2canvas | 1.4.1 | DOM-to-canvas for PDF | Already in package.json |
| @supabase/supabase-js | 2.100.0 | Edge Function invocation, DB queries | Already in package.json |
| date-fns | 3.6.0 | SLA deadline calculation | Already in package.json |

### New Package Required

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| jspdf-autotable | 5.0.7 | Table formatting in PDF | jsPDF 4.x compatible; automates invoice/lease table layout in PDF |

**Installation:**
```bash
npm install jspdf-autotable@5.0.7
```

**Version verification:** `npm view jspdf version` → 4.2.1 (registry); installed: 4.0.0. `npm view jspdf-autotable version` → 5.0.7 (registry).

**Note on jspdf-autotable 5.x API change:** The v5 API changed from `doc.autoTable(...)` to the imported function style:
```javascript
import { autoTable } from 'jspdf-autotable';
autoTable(doc, { head: [...], body: [...] });
```
Do NOT use `doc.autoTable()` — this is the v3/v4 style that no longer works reliably in browser ESM environments.

---

## Architecture Patterns

### Recommended Project Structure (additions)

```
src/
├── services/
│   └── accounting.js          # Add transitionInvoiceStatus() alongside CRUD factory
├── lib/
│   └── AuditLogger.js         # Already exists — no changes needed
├── pages/
│   └── TenantInvoices.jsx     # NEW: Tenant read-only invoice view (D-04)
├── components/
│   └── accounting/
│       ├── InvoiceModal.jsx    # Add status transition buttons (separate from edit modal)
│       └── FinancialReports.jsx # Add PDF export buttons + extend CSV to invoices/leases
supabase/
├── migrations/
│   └── 005_financial_workflows.sql  # NEW: recommendations columns + audit RLS extension
└── functions/
    ├── send-invoice-email/
    │   └── index.ts            # NEW: Resend API caller
    └── mark-overdue-invoices/
        └── index.ts            # NEW: Daily cron target — sets overdue + logs audit
```

### Pattern 1: Service-Layer Status Transition Guard

**What:** A dedicated `transitionInvoiceStatus(invoiceId, newStatus, user)` function that validates the transition is allowed before updating.
**When to use:** Any invoice status mutation — replaces direct `invoicesService.update()` for status changes.

```javascript
// src/services/accounting.js (add alongside existing factory)
const ALLOWED_TRANSITIONS = {
  draft: ['sent', 'void'],
  sent: ['paid', 'overdue', 'void'],
  overdue: ['paid', 'void'],
  paid: [],   // terminal — no transitions allowed
  void: []    // terminal — no transitions allowed
};

export async function transitionInvoiceStatus(invoiceId, newStatus, { userId, userEmail }) {
  // 1. Fetch current invoice
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('id, status')
    .eq('id', invoiceId)
    .single();
  if (fetchError) throw fetchError;

  // 2. Validate transition
  const allowed = ALLOWED_TRANSITIONS[invoice.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Invalid transition: ${invoice.status} → ${newStatus}`);
  }

  // 3. Update
  const { data: updated, error: updateError } = await supabase
    .from('invoices')
    .update({ status: newStatus })
    .eq('id', invoiceId)
    .select()
    .single();
  if (updateError) throw updateError;

  // 4. Audit (non-blocking)
  writeAudit({
    entityType: 'invoice',
    entityId: invoiceId,
    action: 'status_changed',
    oldValue: { status: invoice.status },
    newValue: { status: newStatus },
    userId,
    userEmail
  }).catch(() => {});

  return updated;
}
```

### Pattern 2: Audit Write on Financial Mutations

**What:** Call `writeAudit()` in the `onSuccess` handler of all `useMutation` calls for financial records.
**When to use:** Every create/update/delete on invoices, leases, payments, expenses, recurring_payments.

```javascript
// Pattern from src/lib/AuditLogger.js — already exists
import { writeAudit } from '@/lib/AuditLogger';

// In component mutation:
const createInvoiceMutation = useMutation({
  mutationFn: (data) => invoicesService.create(data),
  onSuccess: (created) => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    writeAudit({
      entityType: 'invoice',
      entityId: created.id,
      action: 'created',
      oldValue: null,
      newValue: created,
      userId: user?.id,
      userEmail: user?.email
    }).catch(() => {});
    setShowInvoiceModal(false);
  }
});
```

### Pattern 3: Supabase Edge Function (Deno)

**What:** TypeScript functions deployed to Supabase's Deno runtime, callable via HTTP or pg_cron.
**When to use:** Send-invoice-email (triggered by client after status transition) and mark-overdue-invoices (triggered by daily cron).

```typescript
// supabase/functions/send-invoice-email/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

Deno.serve(async (req) => {
  const { invoiceId } = await req.json();

  // Fetch invoice + business with service role (bypasses RLS)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, businesses(owner_email, business_name), properties(name)')
    .eq('id', invoiceId)
    .single();

  // Send via Resend
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'UNIT <noreply@yourdomain.com>',
      to: [invoice.businesses.owner_email],
      subject: `Invoice ${invoice.invoice_number} from ${invoice.properties.name}`,
      html: `<p>Invoice ${invoice.invoice_number} for $${invoice.amount} is due on ${invoice.due_date}.</p>
             <p><a href="https://yourapp.com/TenantInvoices?propertyId=${invoice.property_id}">View invoice</a></p>`
    })
  });

  return new Response(JSON.stringify(await res.json()), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

**Invocation from client:**
```javascript
// After transitionInvoiceStatus succeeds and newStatus === 'sent':
await supabase.functions.invoke('send-invoice-email', {
  body: { invoiceId }
});
```

### Pattern 4: Cron-Driven Overdue Detection (pg_cron + Edge Function)

**What:** A daily SQL cron job calls the `mark-overdue-invoices` Edge Function via `net.http_post`.
**When to use:** D-03 — detect overdue invoices daily without any client action.

**Edge Function logic:**
```typescript
// supabase/functions/mark-overdue-invoices/index.ts
Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Find all 'sent' invoices past due_date
  const { data: overdueInvoices } = await supabase
    .from('invoices')
    .select('id, status')
    .eq('status', 'sent')
    .lt('due_date', new Date().toISOString().split('T')[0]);

  for (const invoice of overdueInvoices ?? []) {
    await supabase.from('invoices').update({ status: 'overdue' }).eq('id', invoice.id);
    await supabase.from('audit_log').insert({
      entity_type: 'invoice',
      entity_id: invoice.id,
      action: 'status_changed',
      old_value: { status: 'sent' },
      new_value: { status: 'overdue' },
      performed_by_email: 'system@cron'
    });
  }

  return new Response(JSON.stringify({ processed: overdueInvoices?.length ?? 0 }));
});
```

**pg_cron schedule SQL (run in Supabase SQL editor):**
```sql
-- Requires pg_net and pg_cron extensions enabled
-- Run once after deploying the Edge Function
select cron.schedule(
  'mark-overdue-invoices-daily',
  '0 1 * * *',   -- 1 AM UTC daily
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/mark-overdue-invoices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

**Setup prerequisite:** Vault secrets `project_url` and `service_role_key` must be set in Supabase Vault before this runs. Supabase Cron UI (Dashboard > Cron) can also create this job without SQL.

### Pattern 5: SLA Deadline Calculation

**What:** Calculate `sla_deadline` on assignment (when `assigned_to` is set), not on insert.
**Why on assignment:** Requesting a ticket is not the same as kicking off the SLA clock — but D-07 uses "from submission." Research suggests calculating on insert is cleaner since the priority is set at creation time.

**Recommendation (Claude's discretion):** Calculate on insert using the `priority` field already present at creation time. Store in `sla_deadline` column. The cron job can then check both unassigned and assigned requests.

```javascript
// In recommendationsService.create() or component mutation:
function calculateSlaDeadline(priority) {
  const days = { high: 1, medium: 3, low: 7 };
  const d = new Date();
  d.setDate(d.getDate() + (days[priority] ?? 3));
  return d.toISOString();
}
```

### Pattern 6: PDF Generation with jspdf-autotable

**What:** Client-side PDF generation using jsPDF + autoTable. Brand-styled with UNIT navy header.

```javascript
// In FinancialReports.jsx or Accounting.jsx
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable'; // v5 import style

function exportPDF(invoices, propertyName) {
  const doc = new jsPDF();

  // Brand header
  doc.setFillColor(16, 27, 41); // brand-navy #101B29
  doc.rect(0, 0, 210, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('UNIT — Invoice Report', 14, 16);
  doc.setFontSize(10);
  doc.text(propertyName, 150, 16);
  doc.setTextColor(0, 0, 0);

  // Table
  autoTable(doc, {
    startY: 30,
    head: [['Invoice #', 'Tenant', 'Amount', 'Due Date', 'Status']],
    body: invoices.map(inv => [
      inv.invoice_number,
      inv.business_name,
      `$${inv.amount?.toLocaleString()}`,
      inv.due_date,
      inv.status
    ]),
    headStyles: { fillColor: [29, 38, 58] }, // brand-blue #1D263A
    alternateRowStyles: { fillColor: [240, 240, 242] }
  });

  doc.save(`invoices-${propertyName}-${new Date().toISOString().split('T')[0]}.pdf`);
}
```

### Pattern 7: CSV Generation (vanilla JS — already established)

The existing `exportCSV()` in `FinancialReports.jsx` is a working implementation. Extend it to the Invoices and Leases tabs. No library needed.

```javascript
// Already implemented in FinancialReports.jsx — copy to invoice/lease contexts
const exportCSV = (data, filename) => {
  if (!data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row =>
    Object.values(row).map(v =>
      typeof v === 'string' && v.includes(',') ? `"${v}"` : v
    ).join(',')
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};
```

### Anti-Patterns to Avoid

- **Database trigger for status transitions:** The project uses service-layer enforcement. A DB trigger would add a hidden enforcement layer that conflicts silently with the service layer and is harder to debug.
- **Client-side email sending:** RESEND_API_KEY must never be in client-side code. Always invoke via Edge Function.
- **Using `doc.autoTable()` (old API):** jspdf-autotable v5 requires `autoTable(doc, options)` — the instance method no longer works reliably in ESM.
- **Calling `writeAudit()` without `.catch()`:** Audit failures must never block the primary mutation. Always chain `.catch(() => {})`.
- **Blocking the tenant invoice page behind LandlordGuard:** Tenant invoice page (`TenantInvoices`) is a tenant-facing page — it belongs in the non-LANDLORD_PAGES array in `App.jsx`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF table layout | Custom canvas drawing | `jspdf-autotable` 5.0.7 | Pagination, column widths, styling, row wrapping all handled |
| Email delivery | SMTP direct | Resend API via Edge Function | DNS authentication, deliverability, template management |
| Cron scheduling | External cron service | pg_cron via Supabase Cron | Already included in Supabase — no external service needed |
| CSV encoding | Manual escape logic | Extend existing `exportCSV()` | Already handles comma-in-string quoting; just pass different data |
| Date arithmetic for SLA | Manual ms calculation | `date-fns` addDays() | Already installed; handles timezone edge cases correctly |

**Key insight:** Almost everything needed is already installed. The work is wiring, not infrastructure.

---

## Database Changes Required

### Migration 005 contents

```sql
-- Migration 005: Financial Operations & Workflows
-- SLA/assignment columns on recommendations + RLS for tenant invoice read access

-- 1. Add SLA/assignment columns to recommendations
ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS assigned_to text,
  ADD COLUMN IF NOT EXISTS sla_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS escalated boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_recommendations_escalated ON recommendations(escalated);
CREATE INDEX IF NOT EXISTS idx_recommendations_sla_deadline ON recommendations(sla_deadline);

-- 2. Add index for overdue invoice detection (used by cron daily)
CREATE INDEX IF NOT EXISTS idx_invoices_status_due ON invoices(status, due_date);

-- 3. Tenant invoice read access: tenants can see invoices for their own business
-- (businesses table already has owner_email; invoices has business_id)
CREATE POLICY "Tenants can view own invoices"
  ON invoices FOR SELECT TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_email = auth.jwt()->>'email'
    )
  );

-- 4. Audit log RLS: system/service role needs to INSERT for cron job
-- Note: existing policy "Landlords can insert audit entries" uses is_landlord()
-- The cron Edge Function uses service_role key, which bypasses RLS — no change needed.
```

**Note:** Existing RLS on `invoices` allows landlord SELECT/INSERT/UPDATE/DELETE via `is_landlord()`. The new tenant policy adds a second SELECT policy — Supabase RLS uses OR logic for multiple policies on the same operation.

---

## Common Pitfalls

### Pitfall 1: Tenant Invoice Page Accidentally Protected by LandlordGuard

**What goes wrong:** If `TenantInvoices` is added to the `LANDLORD_PAGES` array in `App.jsx`, tenants won't be able to view their invoices.
**Why it happens:** The array controls which routes get wrapped in `<LandlordGuard>`. Tenant-facing pages must NOT be in this list.
**How to avoid:** Add `TenantInvoices` only to `Pages` registration in `pages.config.js` auto-generation path, not to `LANDLORD_PAGES`.
**Warning signs:** Tenant navigating to `/TenantInvoices` gets redirected to `/LandlordLogin`.

### Pitfall 2: Invoice RLS Blocks Tenant Invoice View

**What goes wrong:** The existing `invoices` RLS policies only allow landlords (via `is_landlord()`) to SELECT. Without a tenant-facing SELECT policy, the tenant invoice page returns zero rows.
**Why it happens:** Phase 1 tightened financial table RLS to landlords only. Tenant read access was not in scope for Phase 1.
**How to avoid:** Migration 005 must add the tenant SELECT policy (see Database Changes above) before TenantInvoices page is built.
**Warning signs:** Tenant invoice page loads but shows "No invoices" even when invoices exist.

### Pitfall 3: Audit Write Uses User from Stale Closure

**What goes wrong:** If `user` from `useAuth()` is accessed inside a closure that runs after the component unmounts or navigates, the audit entry may have null userId/email.
**Why it happens:** React component context is only valid during render and synchronous event handlers.
**How to avoid:** Capture `user.id` and `user.email` at the top of the mutation handler, not inside nested async callbacks.
**Warning signs:** Audit entries appear in the database with null `performed_by_user_id` and empty `performed_by_email`.

### Pitfall 4: jspdf-autotable v5 Import Style Not Used

**What goes wrong:** `doc.autoTable({...})` throws `TypeError: doc.autoTable is not a function` with jspdf-autotable v5.
**Why it happens:** v5 removed auto-application of the plugin to jsPDF instances in browser ESM environments.
**How to avoid:** Use `import { autoTable } from 'jspdf-autotable'; autoTable(doc, {...})`.
**Warning signs:** ESLint error about unused import, or runtime TypeError.

### Pitfall 5: SLA Cron Job Also Needs to Set `escalated = true`

**What goes wrong:** Two separate cron jobs are assumed when one is sufficient — or the overdue-invoice cron is built but the escalation-check cron is forgotten.
**Why it happens:** Invoice overdue detection and request escalation are described together but are separate concerns.
**How to avoid:** Either create two Edge Functions (`mark-overdue-invoices` and `mark-escalated-requests`) scheduled independently, or combine into a single `daily-housekeeping` function. Research recommends two separate functions for clarity.
**Warning signs:** Invoices go overdue but no requests ever show `escalated = true`.

### Pitfall 6: Resend `from` Address Not DNS-Verified

**What goes wrong:** Emails are not delivered or land in spam because the sending domain is not verified with Resend.
**Why it happens:** Resend requires SPF/DKIM/DMARC DNS records on the `from` domain before live delivery.
**How to avoid:** Verify the sending domain in Resend dashboard before deploying the Edge Function to production. During development, use Resend's `onboarding@resend.dev` test address.
**Warning signs:** Edge Function returns `200 OK` from Resend API but emails don't arrive; Resend dashboard shows "domain not verified" errors.

### Pitfall 7: Status Transition Called on Already-Terminal Invoice

**What goes wrong:** A landlord tries to re-send an invoice that's already `paid` or `void`, which should be blocked.
**Why it happens:** Without a transition guard, the UI can pass any status to the update function.
**How to avoid:** The `transitionInvoiceStatus()` function in Pattern 1 throws on invalid transitions. The UI should also disable buttons for terminal states.
**Warning signs:** `paid` invoices reappear as `sent`; audit log shows impossible transitions.

---

## Code Examples

### SLA Deadline on Request Creation

```javascript
// Source: date-fns v3 addDays API (official docs)
import { addDays } from 'date-fns';

const SLA_DAYS = { high: 1, medium: 3, low: 7 };

function getSlaDeadline(priority) {
  return addDays(new Date(), SLA_DAYS[priority] ?? 3).toISOString();
}

// Usage in recommendationsService.create wrapper or component mutation:
const data = {
  ...formData,
  sla_deadline: getSlaDeadline(formData.priority),
  escalated: false
};
```

### SLA Badge Rendering in LandlordRequests

```jsx
// Escalated badge — only shown on landlord view (D-09)
{rec.escalated && (
  <Badge className="bg-red-500/20 text-red-300 border-red-500/30 animate-pulse">
    Escalated
  </Badge>
)}

// SLA progress indicator
const slaPercent = rec.sla_deadline
  ? Math.min(100, ((Date.now() - new Date(rec.created_date)) /
      (new Date(rec.sla_deadline) - new Date(rec.created_date))) * 100)
  : 0;
```

### Invoice Status Transition Buttons in Accounting.jsx

```jsx
// Only show valid next-state buttons based on current status
const STATUS_ACTIONS = {
  draft: [{ label: 'Send to Tenant', newStatus: 'sent', variant: 'default' }],
  sent: [{ label: 'Mark Paid', newStatus: 'paid', variant: 'success' }],
  overdue: [{ label: 'Mark Paid', newStatus: 'paid', variant: 'success' }],
  paid: [],
  void: []
};

// Void is always available from non-terminal states
const canVoid = !['paid', 'void'].includes(invoice.status);
```

### AuditLogger Call Pattern (already established, documented for completeness)

```javascript
// Source: src/lib/AuditLogger.js (existing)
import { writeAudit } from '@/lib/AuditLogger';

writeAudit({
  entityType: 'recommendation',
  entityId: rec.id,
  action: 'status_changed',
  oldValue: { status: rec.status },
  newValue: { status: newStatus },
  userId: user?.id,
  userEmail: user?.email
}).catch(() => {}); // non-blocking per project convention
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `doc.autoTable()` instance method | `autoTable(doc, opts)` function | jspdf-autotable v5 (2025) | Import pattern must change; old code breaks silently in ESM |
| `supabase.functions.invoke()` with anon key | Service role key inside Edge Function; anon key for invocation | Established pattern | RESEND_API_KEY must never be in client bundle |
| pg_cron raw SQL to create jobs | Supabase Cron UI (Dashboard > Cron) + `cron.schedule()` SQL | Supabase added Cron UI (2024-2025) | Can use Dashboard UI or SQL — both are valid |

**Deprecated/outdated in this project:**
- `doc.autoTable()`: Replaced by `autoTable(doc, opts)` in jspdf-autotable v5

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build, npm | Yes | v25.6.0 | — |
| Supabase CLI | Edge Function deploy | Yes | 2.67.1 | — |
| jsPDF | PDF export | Yes (in package.json) | 4.0.0 | — |
| jspdf-autotable | PDF table layout | No (not in package.json) | 5.0.7 (registry) | Must install |
| date-fns | SLA deadline calc | Yes (in package.json) | 3.6.0 | — |
| Resend account + API key | Email delivery | Not verified — needs manual setup | — | Development: use Resend sandbox (`onboarding@resend.dev`) |
| Verified email domain | Production email | Not verified — DNS setup required | — | Development works without it |

**Missing dependencies requiring action:**
- `jspdf-autotable` must be added: `npm install jspdf-autotable@5.0.7`
- Resend API key must be added to Supabase Edge Function Secrets (`RESEND_API_KEY`) before first production send
- DNS domain verification in Resend dashboard required before production send

---

## Open Questions

1. **Where does the tenant invoice page appear in navigation?**
   - What we know: `BottomNav` exists for tenants; `Recommendations.jsx` uses `?propertyId=` URL param pattern; App.jsx routes all tenant pages via `pages.config.js`
   - What's unclear: Whether tenant invoice page should appear in `BottomNav`, or be accessible only via a deep link from the landlord side
   - Recommendation: Add a "Invoices" entry to `BottomNav` and register `TenantInvoices` in `pages.config.js`. Uses `?propertyId=` URL param like all other tenant pages.

2. **Does the SLA cron also need to mark escalated requests, or only a separate cron?**
   - What we know: D-03 specifies a daily cron for overdue invoices. D-08 specifies escalated badge triggered by SLA breach.
   - What's unclear: Whether these run in the same cron job or separate ones.
   - Recommendation: Two separate Edge Functions (`mark-overdue-invoices` and `mark-escalated-requests`) scheduled at the same time (1 AM UTC). Easier to debug and independently disable.

3. **What user identity does the Edge Function use for audit entries from cron?**
   - What we know: The `audit_log` table has `performed_by_user_id uuid` and `performed_by_email text`, both nullable. The cron Edge Function uses `service_role_key` which has no associated `auth.uid()`.
   - What's unclear: Whether a "system" sentinel email should be used.
   - Recommendation: Use `performed_by_email = 'system@cron'` and `performed_by_user_id = null` for automated actions. The `AuditLogTimeline` component should render "System (automated)" for entries with null userId.

4. **Does FIN-02 require audit on DELETE operations?**
   - What we know: D-05 says "every status transition is recorded." FIN-02 says "all financial record mutations."
   - What's unclear: Whether delete is considered a mutation that needs auditing.
   - Recommendation: Yes — add audit writes to all `deleteMutation.onSuccess` handlers in `Accounting.jsx` for invoices and leases.

---

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/lib/AuditLogger.js`, `supabase/migrations/003_landlord_auth.sql`, `src/pages/Accounting.jsx`, `src/components/accounting/FinancialReports.jsx`, `src/services/accounting.js`, `src/pages/LandlordRequests.jsx` — all read directly
- Official Resend docs: https://resend.com/docs/send-with-supabase-edge-functions — verified Resend fetch pattern
- Official Supabase docs: https://supabase.com/docs/guides/functions/schedule-functions — verified pg_cron + Edge Function scheduling pattern
- Official Supabase docs: https://supabase.com/docs/guides/cron/quickstart — verified Supabase Cron UI approach

### Secondary (MEDIUM confidence)
- WebSearch verified: jspdf-autotable 5.0.7 is the current npm version, compatible with jsPDF 4.x, uses `autoTable(doc, opts)` import style — confirmed via multiple sources including GitHub releases and npm
- WebSearch verified: Supabase Edge Functions use Deno runtime, `Deno.env.get()`, `Deno.serve()` — confirmed via official quickstart

### Tertiary (LOW confidence, flag for validation)
- Supabase Vault (`vault.decrypted_secrets`) usage in pg_cron: pattern described in official docs but exact `vault.create_secret()` call syntax needs verification against live Supabase project — consider using the Supabase Cron Dashboard UI as a fallback to avoid Vault dependency

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing packages read from package.json directly; jspdf-autotable version confirmed against npm registry
- Architecture: HIGH — all patterns derived from existing codebase code read directly
- Edge Function/Email patterns: MEDIUM-HIGH — verified against official Resend and Supabase docs
- Pitfalls: HIGH — derived from direct inspection of existing code and known jspdf-autotable v5 breaking change

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable stack; Supabase Edge Function API is stable)
