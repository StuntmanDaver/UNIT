# Roadmap: UNIT

## Overview

UNIT is an existing, working SPA with critical security gaps and incomplete financial workflows. This milestone closes those gaps in dependency order: secure the auth foundation first (everything inherits it), add financial operations and communication on top of it, validate the code with tests before adding payment complexity, then wire Stripe and enrich analytics last when financial data is stable and trusted.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Security & Access Control** - Harden landlord auth from client-side sessionStorage to server-validated roles with centralized route guards (completed 2026-03-26)
- [ ] **Phase 2: Financial Operations & Workflows** - Complete invoice lifecycle, SLA-governed request management, and transactional email notifications
- [ ] **Phase 3: Quality & Reliability** - Automated test coverage for critical paths, error boundaries, and performance baseline
- [ ] **Phase 4: Payments & Analytics** - Stripe Checkout integration, webhook-authoritative payment state, and enriched operational dashboards

## Phase Details

### Phase 1: Security & Access Control
**Goal**: Landlords authenticate via server-validated role accounts and all landlord routes are protected at both the UI and data layers
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. A landlord can log in with an email/password account and access the Dashboard, Requests, and Accounting pages without any sessionStorage code check
  2. A user without a landlord role is redirected away from all landlord routes even if they know the URL
  3. Changing a propertyId in the URL bar does not expose another property's financial data to an unauthorized user
  4. A landlord with access to multiple properties can switch between them within one session without logging out
  5. The `landlord_code` field is no longer readable in API responses for non-landlord users
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Database foundation: profiles table, RLS policies, audit_log, landlord_code cleanup, AuthContext extension
- [x] 01-02-PLAN.md — Route protection: LandlordGuard, PropertyContext, App.jsx routing, LandlordLogin magic link rewrite
- [x] 01-03-PLAN.md — Audit trail: AuditLogger module, AuditLogEntry/Timeline components, AuditPage
- [x] 01-04-PLAN.md — Integration: PropertySwitcher, landlord page migration to PropertyContext, legacy cleanup, E2E verification

**UI hint**: yes

### Phase 2: Financial Operations & Workflows
**Goal**: Invoices follow a tracked lifecycle with an audit trail, requests have SLA-governed assignment and escalation, and key events trigger transactional email
**Depends on**: Phase 1
**Requirements**: FIN-01, FIN-02, FIN-03, FIN-04, FIN-05, REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, COMM-01, COMM-02, COMM-03, COMM-04, COMM-05
**Success Criteria** (what must be TRUE):
  1. An invoice moves through draft → sent → paid → overdue → void and every transition is recorded in an AuditLog entry showing actor, timestamp, and old/new status
  2. A request assigned to a staff member shows the assignee, calculates its SLA deadline in business hours, and is flagged as escalated when the deadline passes without resolution
  3. A landlord receives an email when an SLA deadline reaches 80% elapsed, and a tenant receives an email when their invoice is generated or their request status changes
  4. Accounting data can be exported as CSV and as a formatted PDF from the Accounting page
**Plans**: TBD
**UI hint**: yes

### Phase 3: Quality & Reliability
**Goal**: Critical business logic is covered by automated tests and the application degrades gracefully on component failure or slow connectivity
**Depends on**: Phase 2
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04
**Success Criteria** (what must be TRUE):
  1. Running `vitest` passes a test suite that covers LandlordGuard, AuditLogger, SLA deadline calculation, and invoice state transitions without hitting the live API
  2. When a component throws an unhandled error, the page shows a graceful fallback UI rather than a blank screen or React error cascade
  3. The QR code generated for a business card scans reliably in the camera apps of at least three major devices
**Plans**: TBD

### Phase 4: Payments & Analytics
**Goal**: Tenants can pay invoices online via Stripe Checkout with webhook-authoritative payment state, and landlords have enriched operational KPI dashboards
**Depends on**: Phase 3
**Requirements**: PAY-01, PAY-02, PAY-03, ANLYT-01, ANLYT-02, ANLYT-03, ANLYT-04
**Success Criteria** (what must be TRUE):
  1. A tenant can click "Pay Invoice" and complete payment via Stripe Checkout; the invoice status updates to "paid" only after the Stripe webhook fires (not on client-side confirmation)
  2. A failed or disputed payment does not leave the invoice permanently marked "paid"
  3. The landlord dashboard shows occupancy over time, revenue collected vs. billed, average days-to-resolve for requests, and leases expiring in 30/60/90 day windows
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security & Access Control | 4/4 | Complete   | 2026-03-26 |
| 2. Financial Operations & Workflows | 0/? | Not started | - |
| 3. Quality & Reliability | 0/? | Not started | - |
| 4. Payments & Analytics | 0/? | Not started | - |
