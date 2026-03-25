# Requirements: UNIT

**Defined:** 2026-03-25
**Core Value:** Every tenant business has a discoverable digital presence, and the property can coordinate communication and operations in one shared application.

## v1 Requirements

Requirements for gap-closure milestone. Each maps to roadmap phases.

### Security & Access Control

- [ ] **AUTH-01**: Landlord users have server-validated role accounts (Base44 RLS) replacing code-based sessionStorage auth
- [ ] **AUTH-02**: All landlord routes (Dashboard, Requests, Accounting) are protected by a centralized LandlordGuard component in React Router
- [ ] **AUTH-03**: Base44 RLS rules enforce entity-level access control so landlord data cannot be accessed via direct API calls
- [ ] **AUTH-04**: Landlord can switch between multiple properties within one session without logout/login
- [ ] **AUTH-05**: Auth migration includes a transition window so active landlord sessions are not disrupted
- [ ] **AUTH-06**: Landlord codes are no longer exposed in client-side API responses (field-level security or removal)

### Financial Operations

- [ ] **FIN-01**: Invoices follow a status lifecycle (draft → sent → paid → overdue → void) with enforced transition rules
- [ ] **FIN-02**: All financial record mutations (invoice, payment, expense, lease) are logged to an append-only AuditLog entity with actor, timestamp, old/new values
- [ ] **FIN-03**: All request status changes are logged to the AuditLog entity
- [ ] **FIN-04**: Accounting reports can be exported as CSV
- [ ] **FIN-05**: Accounting reports can be exported as PDF with formatted layout

### Request Workflows

- [ ] **REQ-01**: Recommendations/requests support an assigned_to field for staff/contractor assignment
- [ ] **REQ-02**: Recommendations/requests have SLA target hours configurable by request type
- [ ] **REQ-03**: SLA deadlines are calculated using business-hours awareness (not calendar hours)
- [ ] **REQ-04**: Landlord receives email notification when an SLA deadline is at 80% elapsed
- [ ] **REQ-05**: Requests are flagged as escalated when SLA deadline passes without resolution

### Communications

- [ ] **COMM-01**: Transactional email sent when an invoice is generated for a tenant
- [ ] **COMM-02**: Transactional email sent when a request status changes
- [ ] **COMM-03**: Transactional email sent for lease expiry warnings (30 and 7 days)
- [ ] **COMM-04**: Transactional email sent when a payment is received
- [ ] **COMM-05**: Email delivery uses Resend via Base44 Automations with proper DNS authentication

### Payments

- [ ] **PAY-01**: Stripe Checkout integration allows tenants to pay invoices online
- [ ] **PAY-02**: Invoice status updates to "paid" via Stripe webhook (not client-side)
- [ ] **PAY-03**: Payment confirmation creates an AuditLog entry

### Analytics & Reporting

- [ ] **ANLYT-01**: Landlord dashboard shows occupancy trend over time (not just current snapshot)
- [ ] **ANLYT-02**: Landlord dashboard shows revenue collected vs. billed (collection efficiency)
- [ ] **ANLYT-03**: Landlord dashboard shows average days-to-resolve for requests
- [ ] **ANLYT-04**: Landlord dashboard shows leases expiring in 30/60/90 day windows

### Quality & Reliability

- [ ] **QUAL-01**: Automated test suite covers critical user paths (tenant onboarding, directory, community posts, landlord dashboard)
- [ ] **QUAL-02**: Error boundaries catch and display graceful fallback UI for component failures
- [ ] **QUAL-03**: Route-level code splitting reduces initial bundle size
- [ ] **QUAL-04**: QR code generation verified to scan reliably across major devices and camera apps

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Notifications

- **NOTF-01**: SMS notification channel for critical alerts
- **NOTF-02**: User-configurable notification preferences (per-channel, per-event-type)

### Advanced Workflows

- **ADVW-01**: SLA escalation routing to specific contractors based on request category
- **ADVW-02**: Automated recurring invoice generation from recurring payment schedules
- **ADVW-03**: Tenant self-service payment history view

### Platform

- **PLAT-01**: Accessibility audit with WCAG 2.1 AA compliance
- **PLAT-02**: Structured event tracking / observability for key funnels
- **PLAT-03**: Image optimization pipeline for uploaded assets

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full double-entry bookkeeping / GL | Massive scope; attracts audit/legal liability if done wrong. Export to QuickBooks/Xero covers the handoff. |
| SMS notifications | Carrier costs, A2P 10DLC compliance, marginal benefit over email for property management cycles. |
| OAuth / social login | Email/password via Base44 auth is sufficient for this user base. |
| Mobile native app | Web-first, responsive design covers mobile use cases. |
| Real-time chat between tenants | High complexity, not core to property community value. |
| Document generation (lease contracts) | Separate product category; defer to future milestone. |
| AI-powered request routing / assignment | Overengineering for current scale; manual assignment sufficient. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Pending |
| FIN-01 | Phase 2 | Pending |
| FIN-02 | Phase 2 | Pending |
| FIN-03 | Phase 2 | Pending |
| FIN-04 | Phase 2 | Pending |
| FIN-05 | Phase 2 | Pending |
| REQ-01 | Phase 2 | Pending |
| REQ-02 | Phase 2 | Pending |
| REQ-03 | Phase 2 | Pending |
| REQ-04 | Phase 2 | Pending |
| REQ-05 | Phase 2 | Pending |
| COMM-01 | Phase 2 | Pending |
| COMM-02 | Phase 2 | Pending |
| COMM-03 | Phase 2 | Pending |
| COMM-04 | Phase 2 | Pending |
| COMM-05 | Phase 2 | Pending |
| PAY-01 | Phase 4 | Pending |
| PAY-02 | Phase 4 | Pending |
| PAY-03 | Phase 4 | Pending |
| ANLYT-01 | Phase 4 | Pending |
| ANLYT-02 | Phase 4 | Pending |
| ANLYT-03 | Phase 4 | Pending |
| ANLYT-04 | Phase 4 | Pending |
| QUAL-01 | Phase 3 | Pending |
| QUAL-02 | Phase 3 | Pending |
| QUAL-03 | Phase 3 | Pending |
| QUAL-04 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-25 — traceability populated after roadmap creation*
