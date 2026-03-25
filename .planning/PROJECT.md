# UNIT

## What This Is

UNIT is a multi-tenant property community web application that connects business tenants within commercial properties. It enables tenants to discover neighboring businesses, publish community updates, submit operational requests, and share digital business profiles. It also provides landlord-facing workflows for tenant request management and basic property accounting. Built as a React SPA backed by Base44 entities and auth services.

## Core Value

Every tenant business in a property has a discoverable digital presence, and the property can coordinate communication and operations in one shared application.

## Requirements

### Validated

- ✓ Property discovery with text filtering by name/address/city — existing
- ✓ Business registration with property linkage and logo upload — existing
- ✓ Searchable business directory with category filters and grid/map views — existing
- ✓ Digital business card with QR rendering and share/link copy — existing
- ✓ Community posts (announcements, events, offers) with type-specific fields — existing
- ✓ Recommendation/request system (enhancement, issue, work order) with status progression — existing
- ✓ In-app notifications for posts and recommendations — existing
- ✓ Landlord dashboard with occupancy, revenue, and lease metrics — existing
- ✓ Landlord request management with status updates — existing
- ✓ Accounting views (reports, leases, recurring payments, invoices, expenses) — existing
- ✓ Mobile-first bottom navigation for tenant pages — existing
- ✓ Brand identity with gradient navy-to-steel-blue palette — existing

### Active

**P0 — Security & Access Control:**
- [ ] Migrate landlord auth from code-based to user-role accounts with server-validated roles
- [ ] Enforce access checks uniformly for all landlord routes
- [ ] Add audit trail for request status changes and financial record mutations
- [ ] Multi-property landlord account switching within one session

**P1 — Feature Completion:**
- [ ] Replace pseudo-QR rendering with standards-compliant QR generation library
- [ ] Add invoice-to-payment lifecycle workflow (generation, tracking, status updates)
- [ ] Add route-level guards and centralized role middleware pattern
- [ ] SLA targets, assignment, and escalation for recommendations/requests
- [ ] Email notifications for key events (alongside existing in-app)

**P2 — Quality & Polish:**
- [ ] Integrate Stripe for payment collection
- [ ] Add richer analytics and operational dashboards
- [ ] Add export capabilities for accounting data (CSV/PDF)
- [ ] Automated test suite for critical user paths
- [ ] Error boundaries and offline-safe fallback states
- [ ] Route-level code splitting and image optimization
- [ ] Accessibility audit (semantic labeling, keyboard focus)

### Out of Scope

- Full double-entry bookkeeping / accounting compliance tooling — operational summaries sufficient
- SMS notifications — email + in-app covers current needs
- Advanced IAM / granular permission management beyond landlord/tenant roles — not needed for v1 gap closure
- Full map/CAD floor plans — current coordinate-grid visualization sufficient
- Document generation (lease contracts, invoice PDFs beyond basic export) — defer
- Mobile native app — web-first, mobile later

## Context

**Technical Environment:**
- React 18 SPA with Vite, Tailwind CSS, shadcn/ui, Radix UI
- TanStack Query for server state, React Router v6 for routing
- Base44 SDK as BaaS for auth, entity CRUD, file upload, logging
- No automated test suite currently exists
- Landlord auth is currently client-side code-based (sessionStorage) — major security gap

**Data Model:**
- 10+ Base44 entities: Property, Business, Post, Recommendation, Notification, Ad, Lease, RecurringPayment, Invoice, Expense, Payment
- All queries scoped by propertyId via URL params
- Business ownership linked by owner_email

**Key Unknowns:**
- Base44 SDK capabilities for server-side role validation — needs research
- Whether middleware layer needed between frontend and Base44 for auth hardening

**Existing Gaps (from PRD reverse-engineering):**
- Landlord auth is lightweight client-session only
- Accounting route access control weaker than dashboard guards
- Stripe dependencies present but not wired
- QR code generation is visual/deterministic, not standards-compliant
- No backend validation rules or schema migrations visible
- Hardcoded static values and asset references in marketing content

## Constraints

- **Tech stack**: Must work within Base44 BaaS ecosystem — no custom backend unless Base44 can't support server-side auth
- **Existing code**: Brownfield project — must preserve existing functionality while adding improvements
- **Publishing**: Deployed via Base44 Builder workflow — no custom CI/CD
- **Brand**: Established brand identity (navy-to-steel-blue gradient, "Where Tenants Connect") must be maintained

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Migrate landlord to user-role accounts | Code-based auth is a security risk; client-session storage easily bypassed | — Pending |
| Keep accounting at operational summaries level | Full bookkeeping is massive scope; current users need visibility, not compliance | — Pending |
| Add SLA + assignment to recommendations | Landlords need accountability and tracking for request resolution | — Pending |
| Email + in-app notifications (no SMS) | Email covers async notification needs without SMS complexity/cost | — Pending |
| Multi-property landlord switching | Landlords often manage multiple properties; essential for real usage | — Pending |
| Research Base44 auth capabilities first | Server-side role support unknown — determines architecture of auth hardening | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-25 after initialization*
