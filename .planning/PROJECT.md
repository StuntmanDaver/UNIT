# UNIT

## What This Is

UNIT is a multi-tenant property community web application that connects business tenants within commercial properties. It enables tenants to discover neighboring businesses, publish community updates, submit operational requests, and share digital business profiles. It also provides landlord-facing workflows for tenant request management, audit logging, and basic property accounting. Built as a React SPA backed by Supabase (PostgreSQL database, Auth, and Storage) with a thin service layer at src/services/.

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

**P0 — Security & Access Control (COMPLETED):**
- [x] Migrate landlord auth from code-based to user-role accounts with server-validated roles (Supabase OTP + profiles table)
- [x] Enforce access checks uniformly for all landlord routes (LandlordGuard + PropertyProvider)
- [x] Add audit trail infrastructure for request status changes and financial record mutations (audit_log table + AuditPage)
- [x] Multi-property landlord account switching within one session (PropertySwitcher component)

**P1 — Feature Completion:**
- [x] Replace pseudo-QR rendering with standards-compliant QR generation library (qrcode 1.5.4)
- [ ] Add invoice-to-payment lifecycle workflow (generation, tracking, status updates)
- [x] Add route-level guards and centralized role middleware pattern (LandlordGuard + Supabase RLS)
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
- Supabase as BaaS for auth, PostgreSQL database, and file storage
- Service layer at `src/services/` (11 modules) wraps Supabase JS client
- Schema managed via SQL migrations in `supabase/migrations/`
- No automated test suite currently exists
- Landlord auth uses Supabase OTP with server-validated roles and RLS policies

**Data Model:**
- 15 Supabase tables: properties, businesses, posts, recommendations, notifications, ads, leases, recurring_payments, invoices, expenses, payments, units, profiles, audit_log, activity_logs
- All queries scoped by property_id via URL params and Supabase RLS
- Business ownership linked by owner_email
- Landlord access scoped by property_ids array in profiles table

**Key Unknowns:**
- Whether audit logging writeAudit() calls are wired into all financial mutation paths
- How to implement email notifications (Supabase Edge Functions vs external service like Resend)

**Existing Gaps:**
- Stripe dependencies present but not wired
- 11+ unused dependencies in package.json (Three.js, Leaflet, html2canvas, jsPDF, moment, lodash, etc.)
- Dual toast notification systems (sonner + react-hot-toast) should be consolidated
- No automated test suite
- No React error boundaries
- Duplicated currentUser query pattern across 5+ pages
- Hardcoded static values and asset references in marketing content

## Constraints

- **Tech stack**: Supabase for BaaS (PostgreSQL, Auth, Storage) — no custom backend needed
- **Existing code**: Brownfield project — must preserve existing functionality while adding improvements
- **Publishing**: Static SPA deployed to any hosting capable of serving Vite dist/ output
- **Brand**: Established brand identity (navy-to-steel-blue gradient, "Where Tenants Connect") must be maintained

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Migrate landlord to user-role accounts | Code-based auth is a security risk; client-session storage easily bypassed | DONE — Supabase OTP + profiles table + RLS |
| Keep accounting at operational summaries level | Full bookkeeping is massive scope; current users need visibility, not compliance | — Pending |
| Add SLA + assignment to recommendations | Landlords need accountability and tracking for request resolution | — Pending |
| Email + in-app notifications (no SMS) | Email covers async notification needs without SMS complexity/cost | — Pending |
| Multi-property landlord switching | Landlords often manage multiple properties; essential for real usage | DONE — PropertySwitcher + property_ids array |
| Research Base44 auth capabilities first | Server-side role support unknown — migrated to Supabase instead | DONE — Supabase RLS + profiles + is_landlord() |

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
*Last updated: 2026-03-26 — updated to reflect Supabase migration and Phase 1 completion*
