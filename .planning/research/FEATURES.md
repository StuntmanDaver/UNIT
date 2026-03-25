# Feature Research

**Domain:** Multi-tenant property community SaaS — gap-closure milestone
**Researched:** 2026-03-25
**Confidence:** MEDIUM-HIGH (most findings verified against official docs or multiple credible sources)

---

## Context: Gap-Closure Scope

This research covers 10 specific feature areas slated for the current milestone. The app already has
working implementations of the core tenant/landlord flows. These features close security, usability,
and financial workflow gaps in that existing foundation.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features where absence signals a broken or untrustworthy product in this domain.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Server-side role enforcement (landlord vs tenant) | Landlords manage financial and operational data — client-only auth is a known exploit surface. Any SaaS handling money or tenancy must validate roles on the server. | MEDIUM | The current `sessionStorage` code pattern is a known anti-pattern. Server validation must block API-level access, not just redirect UI. |
| Route-level access guards (centralized middleware) | Industry standard for React SPAs. Missing = landlord routes accessible via direct URL entry with DevTools. Not a UX concern — a security concern. | LOW | React Router v6 protected route component is the standard approach. All landlord routes behind one guard component reduces drift risk. |
| Invoice status lifecycle (draft → sent → paid → overdue) | Property management products universally track invoice state. Landlords cannot manage receivables without knowing what's outstanding. | MEDIUM | Current app stores invoices but only provides manual status edits. Standard states: draft, sent, viewed, partial, paid, overdue, void. Transition rules matter (can't mark void after partial payment without audit note). |
| Transactional email for key events | Tenants and landlords expect email confirmation for: invoice sent, status change on their request, payment received. In-app-only notifications miss the async nature of property management work. | MEDIUM | The existing in-app notification system handles real-time; email covers the async gap. Trigger list: invoice generated, request status change, lease expiry warning (30/7 days), payment received. |
| Standards-compliant QR code for business profile | QR codes must scan reliably on all camera apps. A non-spec QR is the same as a broken feature. | LOW | The app already uses `qrcode` npm package (ISO 18004-compliant) encoding the profile URL. The "pseudo-QR" gap from PROJECT.md appears to be about encoding strategy (URL vs vCard) — not library compliance. Research confirms URL-encoding is the correct modern approach (vCard payload can hit size limits; URL redirect is standard practice). This is LOW complexity to confirm/close. |
| Accounting data export (CSV and PDF) | Landlords need to share financial summaries with accountants and owners. Every credible property management tool exports in CSV/PDF. Missing = the tool fails at the handoff point with external stakeholders. | LOW-MEDIUM | `jspdf` and native CSV generation are already in the dependency tree. Primary work is wiring export buttons to existing report views. PDF layout matters — a raw data dump is not sufficient. |
| Audit trail for financial and status changes | Regulatory expectation in any property management context. "Who changed this invoice to paid and when?" must be answerable. Absence creates liability for landlords. | MEDIUM | Minimum viable audit log: entity type, entity ID, field changed, old value, new value, actor (user/email), timestamp. Append-only. Never editable. Base44's logging capabilities need verification — if not available server-side, a client-emitted append-only AuditLog entity is the fallback. |

### Differentiators (Competitive Advantage)

Features that raise the product above the baseline for this specific use case — a community platform
for commercial multi-tenant properties, not a generic residential landlord tool.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Multi-property account switching | Landlords frequently own or manage 2–5 properties. Context switching without logout/login is a meaningful daily-use improvement over the current single-property session model. Most tools in this tier don't do this well. | MEDIUM | Standard pattern: store `activePropertyId` in user account or JWT claims. Show property name in header with a switcher dropdown. Clear TanStack Query cache on switch. Scope all queries by active property. The current URL-param approach (`?propertyId=`) can be preserved as secondary addressing. |
| SLA targets + assignment + escalation for requests | Commercial property managers have contractor relationships and accountability obligations that residential tools ignore. Adding SLA targets (e.g., "emergency issues resolved within 24h"), assignee field, and escalation visibility directly serves this commercial use case. | MEDIUM-HIGH | The existing `Recommendation` entity has status but no `assigned_to`, `sla_target`, `sla_deadline`, or `escalated` fields. Industry standard: SLA countdown starts on submission, escalation triggers when deadline passes without resolution. For this app's scale, pre-breach alerting (email to landlord when SLA is 80% elapsed) is sufficient — no need for AI routing. |
| Stripe payment collection (tenant pays rent in-app) | Moving from tracking rent to collecting it turns UNIT from a management dashboard into a revenue tool. Tenants paying online is expected by 78% of renters (MEDIUM confidence — single survey source). Reduces landlord bank-deposit chasing. | HIGH | Stripe dependencies (`@stripe/react-stripe-js`, `@stripe/stripe-js`) are already installed but unwired. The right integration shape for this app: Stripe Checkout (not Connect) for direct landlord account payments. Connect is for marketplace routing — UNIT is not a marketplace. Single landlord Stripe account, tenant payment link per invoice, webhook updates invoice status to paid. |
| Analytics dashboard with operational KPIs | The current landlord dashboard shows metrics but lacks the comparative and trend views that drive decisions. Adding occupancy trends over time, revenue vs. budget, request resolution rate, and lease renewal velocity creates genuine management visibility. | MEDIUM | Property management KPIs that matter at this scale: occupancy rate, revenue collected vs. billed (collection efficiency), average days-to-resolve requests, leases expiring in 30/60/90 days, total outstanding invoices. `recharts` is already installed — implementation is data wiring, not new UI infrastructure. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full double-entry bookkeeping / GL | "We want real accounting" | Massive scope increase. Compliance, chart-of-accounts management, journal entries, trial balance — this is a separate product category. Attracts audit/legal liability if done wrong. | Keep operational summaries (income vs. expenses by period). Export to CSV for import into QuickBooks/Xero. |
| SMS notifications | "Email gets missed" | Carrier costs, number registration compliance (A2P 10DLC in the US), higher complexity per notification, and privacy regulation variance by jurisdiction. Marginal benefit over email for property management cycles. | Email (async) + in-app (real-time) covers the same use case without the regulatory surface. Already in scope. |
| Granular IAM / permission matrix | "Our property manager should only see leases, not financials" | Sub-role scoping requires per-entity permission tables, UI adaptation logic, and audit complexity that grows superlinearly. The two-role model (landlord / tenant) is sufficient for v1 and most properties. | Add a `property_manager` sub-role with read-only accounting if demand becomes clear from actual users. |
| Tenant-to-tenant direct messaging | "We want tenants to communicate" | Moderation burden, abuse surface, and community health issues. Pulls scope toward a social platform which is a different product. | Community posts (announcements, events, offers) already fill the broadcast communication need. Direct tenant connections happen through the business profile QR/contact info, outside the app. |
| Offline-first / PWA full sync | "The app should work without internet" | Service worker complexity, conflict resolution for financial records, and testing burden are very high. The app is used intermittently by property staff who have reliable connectivity in office contexts. | Add error boundaries and graceful loading states for partial connectivity, which is already in the P2 backlog. Not offline-first. |
| Real-time collaborative editing of leases | "Multiple landlord users should edit simultaneously" | Operational transform / CRDT infrastructure is a major investment. Multi-property switching already implies multiple sessions, but simultaneous editing of the same lease is an edge case with low value at this scale. | Last-write-wins with an audit trail of changes is sufficient. Show "last edited by" on lease records. |

---

## Feature Dependencies

```
[Server-Side Role Enforcement]
    └──required-by──> [Multi-Property Account Switching]
                          └──required-by──> [Route-Level Guards]
    └──required-by──> [Audit Trail]
                          └──enhances──> [Invoice Lifecycle]
                          └──enhances──> [SLA + Assignment]

[Invoice Lifecycle]
    └──required-by──> [Stripe Payment Collection]
    └──required-by──> [Transactional Email (invoice events)]
    └──required-by──> [Accounting Data Export]

[Transactional Email]
    └──depends-on──> [Email service provider (Resend/Postmark/SendGrid)]

[SLA + Assignment]
    └──enhances──> [Transactional Email (escalation + status events)]
    └──enhances──> [Audit Trail (SLA breach logging)]

[Analytics Dashboard]
    └──enhanced-by──> [Invoice Lifecycle] (collection metrics)
    └──enhanced-by──> [SLA + Assignment] (resolution rate metrics)

[QR Code (URL-based)]
    └──no-dependencies──> standalone feature
```

### Dependency Notes

- **Server-side roles required before multi-property switching:** Switching properties without server-validated context is unsafe — the switch must carry authenticated tenant context, not a client-held property ID.
- **Invoice lifecycle required before Stripe:** Stripe webhooks update invoice status; the lifecycle state machine must exist before payment events have a target to update.
- **Audit trail enhances both invoice and SLA:** Both need an immutable change history. Building the audit mechanism once and applying it to both is more efficient than building per-entity logging.
- **Transactional email depends on external service:** A BaaS-side email integration or a serverless function call is needed. Base44's native email capabilities need explicit verification before implementation. If unavailable natively, Resend is the current developer-preferred alternative (API-first, React Email templates, strong deliverability).

---

## MVP Definition (for this milestone)

This is not a greenfield MVP — it is a gap-closure milestone on an existing product. The
"launch with" set represents the minimum to close the security and functional gaps that make
the product unreliable for real landlords.

### Close With This Milestone (P0 + P1 parity)

- [ ] Server-side role enforcement — closes the auth security gap that makes current landlord access trivially bypassable
- [ ] Route-level guards (centralized) — makes enforcement consistent across all landlord routes
- [ ] Multi-property account switching — enables real landlord use cases; currently broken for multi-property operators
- [ ] Audit trail (financial + status changes) — closes accountability gap; required for any landlord trusting financial data in the tool
- [ ] Standards-compliant QR code (confirm/validate existing) — LOW complexity; confirm `qrcode` library behavior is correct or swap encoding to vCard if required
- [ ] Invoice lifecycle workflow — adds the state transitions and visibility that make invoice tracking meaningful
- [ ] SLA targets + assignment + escalation for requests — commercial property management differentiator; adds accountability to request workflows
- [ ] Transactional email for key events — closes the async notification gap (invoice sent, request updated, lease warning)

### Add When Core is Stable (P2)

- [ ] Stripe payment collection — HIGH complexity and external dependency; requires stable invoice lifecycle first
- [ ] Analytics dashboard (richer KPIs) — recharts already installed; wire after operational data model is clean
- [ ] Accounting data export CSV/PDF — jspdf already installed; LOW effort once reports are finalized

### Future Consideration (v2+)

- [ ] Tenant-facing payment portal (Stripe Checkout link in tenant email) — requires Stripe onboarding complete
- [ ] SLA benchmark reporting (resolution time vs. targets over time) — requires sufficient historical data
- [ ] Property manager sub-role — requires demand evidence from actual users

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Server-side RBAC | HIGH (security) | MEDIUM | P1 |
| Route guards (centralized) | HIGH (security) | LOW | P1 |
| Audit trail | HIGH (accountability) | MEDIUM | P1 |
| Multi-property switching | HIGH (usability) | MEDIUM | P1 |
| Invoice lifecycle | HIGH (financial ops) | MEDIUM | P1 |
| Transactional email | HIGH (async notification) | MEDIUM | P1 |
| SLA + assignment + escalation | MEDIUM-HIGH (commercial ops) | MEDIUM-HIGH | P1 |
| QR code (confirm/close) | LOW (already mostly working) | LOW | P1 |
| Accounting export CSV/PDF | MEDIUM (external handoff) | LOW | P2 |
| Analytics dashboard (richer) | MEDIUM (decision support) | MEDIUM | P2 |
| Stripe payments | HIGH (revenue) | HIGH | P2 |

**Priority key:**
- P1: Must have for this milestone
- P2: Should have, add when P1 is stable
- P3: Nice to have, future consideration

---

## Implementation Notes by Feature

### 1. Server-Side RBAC

The current pattern checks `sessionStorage.getItem('landlord_property_id')` on the client.
Anyone with browser DevTools can set this and access landlord routes.

Standard SaaS pattern for this constraint:
- Assign user a `role` field (`landlord` | `tenant`) at registration
- Validate role server-side on every protected data operation — not just at route entry
- Base44 SDK capabilities for server-side role validation are a **key unknown** flagged in PROJECT.md. If Base44 supports entity-level access rules or server functions, implement there. If not, a thin serverless middleware layer (Cloudflare Worker or Vercel Edge Function) may be required.
- Roles are **property-scoped** — a landlord role is only valid for their property IDs

**Confidence:** MEDIUM — standard pattern is clear; Base44 implementation path needs verification

### 2. Multi-Property Account Switching

Standard Slack-style pattern:
- Header switcher component showing current property name
- On switch: update `activePropertyId` in user state (context or TanStack Query), clear all property-scoped cache, navigate to dashboard for new property
- URL params (`?propertyId=`) can remain as secondary addressing but must be backed by server-validated ownership
- State: `{ userId, properties: [{ id, name, role }], activePropertyId }`

**Confidence:** HIGH — pattern is well-documented across multiple credible sources

### 3. Audit Trail

Minimum viable schema for an audit log entity:
```
AuditLog {
  entity_type: string    // "Invoice" | "Recommendation" | "Lease" | "Payment"
  entity_id: string
  action: string         // "status_changed" | "amount_updated" | "created" | "deleted"
  field: string          // which field changed
  old_value: string
  new_value: string
  actor_email: string
  actor_role: string     // "landlord" | "tenant"
  property_id: string
  created_date: datetime // server-set, not client-set
}
```
Append-only: no update or delete operations permitted on AuditLog. Display in a timeline/feed
view on relevant entity detail screens.

**Confidence:** HIGH — industry standard schema; append-only requirement is universal

### 4. QR Code (Standards Review)

Codebase inspection confirms:
- `qrcode` npm package v1.5.4 is installed and active in `BusinessQRCode.jsx`
- It encodes the business profile **URL** (not vCard) — correct modern approach
- ISO 18004-compliant generation with configurable error correction level
- The PROJECT.md "pseudo-QR" gap description appears to be from a previous implementation — the current code is already standards-compliant

**Action:** Audit QR rendering on multiple devices to confirm. If the concern was about vCard encoding, the URL approach is actually preferable (no size constraints, profile URL is more shareable). Close this gap after device testing.

**Confidence:** HIGH (code confirmed)

### 5. Invoice Lifecycle

Standard states and transitions:
```
draft → sent → viewed → paid
              ↓         ↓
           overdue ←────┘ (if due_date passes unpaid)
              ↓
            void
```
Key additions to current model:
- `sent_date` field (when the invoice was emailed to tenant)
- `viewed_date` field (optional — if using tracked links)
- `paid_date` field (set by webhook if Stripe, or manually)
- `void_reason` field (required to void)
- Automated `overdue` flag based on `due_date` vs current date (can be a computed view)
- No UI for "partial payment" unless Stripe is wired — manual tracking is out of scope for v1

**Confidence:** HIGH — standard pattern across all property management tools researched

### 6. SLA + Assignment + Escalation

Minimum viable for commercial property context:
- `assigned_to` field on Recommendation (name/email of responsible party)
- `sla_target_hours` field (set by landlord per request type or globally per property: e.g., emergency=4h, general=48h)
- `sla_deadline` field (computed: `created_date + sla_target_hours`)
- `escalated` boolean flag (set true when `sla_deadline` passes without `resolved` status)
- Escalation trigger: a scheduled check or computed flag on data load — not real-time for this app's scale
- Display: show SLA status (green/amber/red) in the request list view

Escalation email: send to landlord when request passes SLA deadline without resolution.
No need for auto-assignment routing, AI matching, or GPS proximity (enterprise features inappropriate at this scale).

**Confidence:** HIGH — pattern verified against multiple property management platforms

### 7. Transactional Email

Trigger events (minimum set):
1. Invoice generated and sent to tenant
2. Invoice status changed to paid (confirmation to landlord)
3. Request status updated (tenant notification)
4. Request escalated past SLA (landlord notification)
5. Lease expiring in 30 days (landlord notification)
6. Lease expiring in 7 days (landlord notification — second notice)

Email service recommendation: **Resend** (API-first, developer-friendly, React Email templates
compatible with the existing stack, strong deliverability, no sales friction at this scale).
Alternative: Postmark (excellent deliverability, well-documented, slightly higher pricing per volume).
Avoid: SendGrid (enterprise pricing friction, support issues at small scale).

Base44 native email capability is a **key unknown** — if the SDK supports email dispatch from
entity events, use that. Otherwise, a serverless function or edge function calling Resend's API
is the standard workaround.

**Confidence:** MEDIUM — service selection HIGH confidence; Base44 integration path LOW confidence pending SDK research

### 8. Stripe Integration

Correct integration shape for UNIT:
- **Stripe Checkout** (not Connect) — UNIT is not a marketplace. The landlord has one Stripe account. Tenants pay invoices via Checkout links.
- Flow: Invoice created → landlord triggers "send invoice" → system generates Stripe Checkout session → URL embedded in email to tenant → tenant pays → Stripe webhook fires → invoice status updated to paid
- No need for Stripe Connect's sub-merchant onboarding, routing, or platform fees at this stage
- ACH (bank transfer) should be offered alongside card — rent amounts are high enough that tenants prefer ACH to avoid card fees

Dependencies wired already: `@stripe/react-stripe-js` and `@stripe/stripe-js` are in `package.json`.
Missing: server-side Stripe API calls (secret key operations) require a backend — either a Base44 integration, a serverless function, or a backend-for-frontend layer.

**Confidence:** HIGH — Stripe's own documentation and Re-Leased case study confirm this pattern

### 9. Accounting Data Export

What to export:
- Financial summary (income vs. expenses by date range) → PDF
- Invoice list with status → CSV (for accountant import)
- Expense list → CSV
- Lease roll (active leases, rent amounts, expiry) → PDF

`jspdf` is already installed for PDF. CSV is native (no library needed — construct delimited string
and trigger download). The implementation complexity is primarily in deciding column structure and
date range filters, not in the export mechanism itself.

**Confidence:** HIGH — well-established pattern; dependencies already present

### 10. Analytics Dashboard

KPIs that matter at this property scale (not enterprise-grade, but meaningful for a 10–50 tenant property):
- Occupancy rate (active leases / total units)
- Collection efficiency (amount paid / amount billed, by period)
- Outstanding receivables (sum of unpaid invoices, aged by 0–30/30–60/60+ days)
- Request resolution rate (resolved / total, by period)
- Average days to resolve requests (by request type)
- Lease renewals upcoming (30/60/90 day horizon)

`recharts` is already installed. Data for all metrics is available in existing entities.
Implementation is primarily: define calculation logic, compose chart components, add date range
filtering to the existing Financial Reports tab.

**Confidence:** HIGH — KPIs are standard; recharts library is already in the project

---

## Competitor Feature Analysis

| Feature | AppFolio / Buildium (enterprise) | Landlord Studio (indie) | UNIT approach |
|---------|----------------------------------|------------------------|---------------|
| RBAC | Full IAM with sub-roles | Simple landlord/tenant | 2-role model sufficient for v1 |
| Property switching | Yes — multi-portfolio | Single property per account | Header switcher, scoped by role |
| Audit trail | Full GL-level audit | Basic change log | Append-only AuditLog entity |
| QR codes | Not a feature | Not a feature | Differentiator: business profile QR |
| Invoice lifecycle | Full AP/AR workflow | Basic tracking | 6-state machine, Stripe-wired |
| SLA / requests | Enterprise maintenance workflows | Basic issue tracking | SLA + assignment, no AI routing |
| Email notifications | Robust multi-trigger | Limited | 6 key event triggers |
| Stripe | ACH + card via embedded | Card only | Checkout sessions, ACH priority |
| Export | CSV, PDF, QBO sync | CSV, PDF | CSV + PDF, no QBO at v1 |
| Analytics | Enterprise dashboards + benchmarks | Basic charts | 6 KPIs, recharts, scoped to property |

---

## Sources

- [Building Role-Based Access Control for a Multi-Tenant SaaS Startup](https://medium.com/@my_journey_to_be_an_architect/building-role-based-access-control-for-a-multi-tenant-saas-startup-26b89d603fdb)
- [How to design an RBAC model for multi-tenant SaaS — WorkOS](https://workos.com/blog/how-to-design-multi-tenant-rbac-saas)
- [Best Practices for Multi-Tenant Authorization — Permit.io](https://www.permit.io/blog/best-practices-for-multi-tenant-authorization)
- [React Router Protected Routes — Robin Wieruch](https://www.robinwieruch.de/react-router-private-routes/)
- [Protected Routes and Authentication with React Router — ui.dev](https://ui.dev/react-router-protected-routes-authentication)
- [Best Property Management Software with Audit Trail 2025 — GetApp](https://www.getapp.com/real-estate-property-software/property-management/f/audit-trail/)
- [react-qr-code npm package](https://www.npmjs.com/package/react-qr-code)
- [qrcode.react npm package](https://www.npmjs.com/package/qrcode.react)
- [qrcode npm package (node-qrcode)](https://www.npmjs.com/package/qrcode)
- [What is Invoice Lifecycle Management? — PaidNice](https://www.paidnice.com/dictionary/invoice-lifecycle-management)
- [SLA Tracking for Property Maintenance — Lula](https://lula.life/articles/sla-tracking)
- [Digital Work Order Management for Commercial Property — OxMaint](https://oxmaint.com/industries/property-management/digital-work-order-management-software-commercial-property)
- [Top 6 Email Service Providers for Transactional Email 2025 — Courier](https://www.courier.com/blog/top-6-email-service-providers-for-transactional-notifications-in-2025)
- [How to accept rent payments online — Stripe](https://stripe.com/resources/more/how-to-accept-rent-payments-online)
- [Re-Leased uses Stripe to digitise $15bn rent collection — Stripe case study](https://stripe.com/customers/re-leased)
- [Embedded Payments for SaaS — Stripe](https://stripe.com/resources/more/embedded-payments-for-growth)
- [9 Best Property Management and Accounting Software — Landlord Studio](https://www.landlordstudio.com/blog/best-property-accounting-software)
- [11 Property Management KPIs to Track — Buildium](https://www.buildium.com/blog/property-management-kpis-to-track/)
- [Property Management Dashboard KPIs — iNetSoft](https://www.inetsoft.com/info/rental-property-management-dashboards/)

---

*Feature research for: multi-tenant property community SaaS (UNIT — gap-closure milestone)*
*Researched: 2026-03-25*
