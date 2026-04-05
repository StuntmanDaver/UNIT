# UNIT -- Project Completion Proposal

**Prepared by:** David K  
**Date:** April 3, 2026  
**Delivery Deadline:** May 1, 2026  
**Document Type:** Contractor Engagement Proposal  

---

## 1. Executive Summary

This proposal outlines the scope, timeline, deliverables, dependencies, and third-party access requirements to complete the **UNIT** property community web application and prepare for a future iOS native app transition.

UNIT is a multi-tenant property community platform that connects business tenants within commercial properties. It enables tenants to discover neighboring businesses, publish community updates, submit operational requests, and share digital business profiles. It also provides landlord-facing workflows for tenant request management, audit logging, and property accounting.

The application is built as a **React single-page application (SPA)** backed entirely by **Supabase** (PostgreSQL database, Auth, Row Level Security, Storage, and Edge Functions). There is no custom backend server -- all server-side logic is implemented through PostgreSQL functions, RLS policies, database triggers, and Supabase Edge Functions. This architecture was chosen deliberately to minimize operational overhead and maximize development velocity.

> **Important Note:** This project was previously prototyped on the Base44 platform and has been **fully migrated to Supabase** as the backend-as-a-service provider. All authentication, database operations, storage, and server-side logic now run on Supabase infrastructure. No Base44 dependencies remain in the codebase, and all references to Base44 have been removed. The migration included rebuilding authentication (magic link OTP via Supabase Auth), implementing Row Level Security across all 15 database tables, and establishing a SQL migration-managed schema at `supabase/migrations/`.

### Current Project Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: Security & Access Control | **COMPLETE** | Server-validated landlord auth, RLS policies, audit trail, multi-property switching |
| Phase 2: Financial Operations & Workflows | **COMPLETE** | Invoice lifecycle, audit logging, SLA tracking, email notifications, CSV/PDF export |
| Phase 3: Quality & Reliability | **COMPLETE** | Test suite, error boundaries, code splitting, QR validation |
| Phase 4: Payments & Analytics | **NOT STARTED** | Stripe integration, enhanced dashboards, remaining email templates, SLA configuration |

**32 of 38 total requirements are complete.** This proposal covers the remaining 6 requirements plus production deployment, polish, and iOS transition planning.

---

## 2. Scope of Work

### 2.1 Phase 4 -- Payments & Analytics (Remaining Development)

#### 2.1.1 Stripe Payment Integration
- Integrate **Stripe Checkout** for tenant invoice payments
- Implement Stripe webhook handler via Supabase Edge Function to authoritatively update invoice payment status
- Record payment confirmations in the append-only `audit_log` table
- Connect payment flow to existing `TenantInvoices` page so tenants can pay directly
- Configure Stripe product/price objects for recurring and one-time charges

#### 2.1.2 Enhanced Landlord Analytics Dashboards
- **Occupancy trend over time:** Historical chart showing vacancy/occupancy rates by month
- **Revenue collection efficiency:** Billed vs. collected revenue comparison with visual KPIs
- **Request resolution metrics:** Average days-to-resolve, SLA compliance percentage
- **Lease expiration windows:** 30/60/90-day upcoming expiration views with drill-down

#### 2.1.3 SLA Configuration & Business-Hours Calculation
- Configurable SLA target hours by request type (enhancement, issue, work order)
- Business-hours-aware deadline calculation (excluding weekends and configured holidays)
- Automated email notification at 80% SLA elapsed (warning alert to assigned landlord)

#### 2.1.4 Remaining Transactional Email Templates
- Request status change notification (to tenant who submitted)
- Lease expiry warning at 30 days and 7 days (to landlord)
- Payment received confirmation (to landlord and tenant)
- Delivered via existing Supabase Edge Functions + Resend email infrastructure

### 2.2 Production Readiness & Polish

#### 2.2.1 Dependency Cleanup
- Remove 11+ unused npm packages (Three.js, Leaflet, html2canvas, jsPDF, React Quill, React Markdown, canvas-confetti, moment, lodash) to reduce bundle size
- Consolidate dual toast notification systems (sonner + react-hot-toast) into a single library
- Resolve or remove unused Stripe packages if superseded by new integration approach

#### 2.2.2 Code Quality
- Extract duplicated `currentUser` query pattern (currently in 5+ pages) into a shared `useCurrentUser` hook
- Audit and wire `writeAudit()` calls into any remaining unwired mutation paths
- Remove hardcoded static values and asset references from marketing content

#### 2.2.3 Accessibility & Performance
- Semantic HTML labeling audit across all pages
- Keyboard focus management for modal dialogs and navigation flows
- Image optimization (lazy loading, responsive srcset where applicable)
- Lighthouse performance audit with target score of 90+

#### 2.2.4 Production Deployment
- Configure hosting environment (Vercel or Netlify) with SPA routing rules
- Set up environment variables for production Supabase project
- Configure custom domain and SSL
- Set up CI/CD pipeline via GitHub Actions (lint, test, build, deploy)

### 2.3 iOS App Transition Planning

#### 2.3.1 Deliverable: iOS Transition Architecture Document
A comprehensive technical document covering:

- **Recommended approach:** React Native (via Expo) or Capacitor wrapper for the existing React SPA
- **Shared logic assessment:** Identification of service layer code (`src/services/`), React Query hooks, and business logic that can be reused across web and iOS
- **Supabase compatibility:** The Supabase JS client (`@supabase/supabase-js`) is fully compatible with React Native environments. Auth session persistence, real-time subscriptions, and storage uploads work identically on iOS. No backend changes are required for the mobile transition.
- **Native feature mapping:** Push notifications (APNs integration via Supabase Edge Functions), camera access for logo uploads, biometric authentication, deep linking for QR code scans
- **App Store requirements:** Privacy policy, data handling disclosures, review guidelines compliance
- **Estimated timeline and cost** for iOS MVP based on chosen approach

#### 2.3.2 Progressive Web App (PWA) as Interim Step
- Add service worker and web app manifest to enable "Add to Home Screen" on iOS Safari
- Configure offline fallback pages for core read-only views (Directory, Profile)
- This provides an immediate mobile-app-like experience while native development is underway

---

## 3. Technical Architecture

### 3.1 System Architecture Diagram

```
+--------------------------------------------------+
|                   CLIENT (SPA)                    |
|                                                   |
|  React 18 + React Router + TanStack Query         |
|  Tailwind CSS + shadcn/ui + Radix UI              |
|  Vite build -> static dist/                       |
+--------------------------------------------------+
          |              |              |
          v              v              v
+--------------------------------------------------+
|              SUPABASE (BaaS)                      |
|                                                   |
|  +------------+  +----------+  +---------------+  |
|  | PostgreSQL |  |   Auth   |  |    Storage     | |
|  | 15 tables  |  | OTP/     |  | public-assets  | |
|  | RLS on all |  | Magic    |  | bucket         | |
|  | SQL fns    |  | Link     |  |               | |
|  +------------+  +----------+  +---------------+  |
|                                                   |
|  +----------------------------------------------+ |
|  |           Edge Functions                      | |
|  | send-invoice-email | mark-overdue-invoices    | |
|  | mark-escalated-requests | stripe-webhook*     | |
|  +----------------------------------------------+ |
+--------------------------------------------------+
          |
          v
+--------------------------------------------------+
|           THIRD-PARTY SERVICES                    |
|                                                   |
|  Stripe (payments)  |  Resend (transactional      |
|                      |  email delivery)            |
|                      |                             |
|  Vercel/Netlify     |  GitHub (source control      |
|  (static hosting)    |  + CI/CD)                   |
+--------------------------------------------------+

* = New in Phase 4
```

### 3.2 Data Model

15 PostgreSQL tables managed via SQL migrations in `supabase/migrations/`:

| Table | Purpose | RLS Scope |
|-------|---------|-----------|
| `properties` | Property listings | Public read |
| `businesses` | Tenant business profiles | Property-scoped |
| `posts` | Community posts (announcements, events, offers) | Property-scoped |
| `recommendations` | Tenant requests (enhancement, issue, work order) | Property-scoped |
| `notifications` | In-app notification inbox | User email-scoped |
| `units` | Physical unit inventory with occupancy status | Property-scoped |
| `leases` | Lease terms and status | Landlord-scoped |
| `recurring_payments` | Scheduled payment definitions | Landlord-scoped |
| `invoices` | Invoice lifecycle (draft->sent->paid->overdue->void) | Landlord-scoped |
| `expenses` | Property expense records | Landlord-scoped |
| `payments` | Payment transaction records | Landlord-scoped |
| `profiles` | User roles (tenant/landlord) and property assignments | Own-row only |
| `audit_log` | Append-only mutation trail | Landlord read + insert only |
| `activity_logs` | Page visit tracking | Own-row only |
| `ads` | Property advertisements | Property-scoped |

### 3.3 Authentication Model

| User Type | Auth Method | Session | Access Control |
|-----------|-------------|---------|----------------|
| Tenant | Supabase Auth (email signup) | JWT via Supabase client | RLS: `owner_email` match |
| Landlord | Supabase Auth (magic link OTP) | JWT via Supabase client | RLS: `is_landlord()` + `landlord_property_ids()` |
| Anonymous | None | None | Public read on `properties` |

All authentication is handled by **Supabase Auth** with server-validated roles. The `profiles` table stores `role` (tenant/landlord) and `property_ids` (uuid array for landlord property access). PostgreSQL helper functions `is_landlord()` and `landlord_property_ids()` enforce access at the database layer via Row Level Security policies. No client-side auth tokens or codes are used for access control.

---

## 4. Delivery Timeline

**Total Duration:** 28 calendar days (April 3 -- May 1, 2026)

### Week 1: April 3--9
| Task | Days | Deliverable |
|------|------|-------------|
| Dependency cleanup & unused package removal | 1 | Reduced bundle, single toast system |
| Extract `useCurrentUser` hook, deduplicate patterns | 1 | Cleaner codebase, shared hooks |
| Audit logging coverage audit & wiring | 1 | All mutation paths covered |
| SLA configuration schema & business-hours calc | 2 | Configurable SLA with business-hours awareness |

### Week 2: April 10--16
| Task | Days | Deliverable |
|------|------|-------------|
| Stripe Checkout integration (frontend + Edge Function) | 3 | Tenant payment flow on TenantInvoices page |
| Stripe webhook handler for payment confirmation | 1 | Webhook-authoritative invoice status updates |
| Payment audit trail logging | 1 | Payment events in audit_log |

### Week 3: April 17--23
| Task | Days | Deliverable |
|------|------|-------------|
| Enhanced analytics dashboards (4 KPI views) | 3 | Occupancy trend, revenue efficiency, request metrics, lease windows |
| Remaining email templates (4 templates) | 2 | Status change, lease expiry, payment received, SLA warning |

### Week 4: April 24--30
| Task | Days | Deliverable |
|------|------|-------------|
| Accessibility audit & fixes | 1 | Semantic labeling, keyboard focus |
| PWA manifest & service worker | 1 | Add-to-home-screen, offline fallback |
| Production deployment & CI/CD setup | 1 | Live application on custom domain |
| iOS transition architecture document | 1 | Technical roadmap for native app |
| End-to-end testing & QA | 1 | Verified user journeys, bug fixes |

### May 1: Final Delivery
- All source code committed to main branch
- Production application live and accessible
- Documentation package delivered (see Section 7)

---

## 5. Dependencies & Third-Party Access Requirements

### 5.1 Required Third-Party Accounts & Access

The following accounts and credentials must be provisioned or shared **before development begins**. Delays in provisioning will directly impact the delivery timeline.

| Service | Purpose | Access Needed | Setup Responsibility | Est. Cost |
|---------|---------|---------------|---------------------|-----------|
| **Supabase** | Database, Auth, Storage, Edge Functions | Project owner or admin role on the production Supabase project | Client | Free tier or Pro ($25/mo) |
| **Stripe** | Payment processing for tenant invoices | Stripe account with API keys (publishable + secret), webhook signing secret | Client | 2.9% + $0.30 per transaction |
| **Resend** | Transactional email delivery | API key with send permissions, verified sending domain | Client | Free tier (100 emails/day) or Pro ($20/mo) |
| **GitHub** | Source control, CI/CD | Repository write access, ability to configure GitHub Actions | Client/Contractor | Free |
| **Vercel** _or_ **Netlify** | Static SPA hosting | Team or project admin access for deployment configuration | Client | Free tier or Pro ($20/mo) |
| **Custom Domain** (optional) | Production URL | DNS management access for domain pointing | Client | Varies |
| **Apple Developer Account** (future) | iOS App Store distribution | Not needed for this engagement; required for iOS app submission | Client | $99/year |

### 5.2 Environment Variables Required

These must be configured in both development (`.env.local`) and production hosting environments:

```
# Supabase (existing -- already configured)
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>

# Stripe (new -- Phase 4)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_<key>
STRIPE_SECRET_KEY=sk_live_<key>          # Edge Function env only
STRIPE_WEBHOOK_SECRET=whsec_<key>        # Edge Function env only

# Resend (existing -- already configured for Edge Functions)
RESEND_API_KEY=re_<key>                  # Edge Function env only

# Hosting
VITE_APP_URL=https://<production-domain>  # Used for email links and QR codes
```

### 5.3 Development Dependencies (npm packages)

All current and new npm dependencies for the project:

#### Core Framework
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 18.2.0 | UI framework |
| `react-dom` | 18.2.0 | React DOM renderer |
| `react-router-dom` | 6.26.0 | Client-side routing |
| `vite` | 6.1.0 | Build tool and dev server |
| `@vitejs/plugin-react` | 4.3.4 | React Vite plugin |

#### Backend & Data
| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | 2.100.0 | Supabase client (Auth, DB, Storage) |
| `@tanstack/react-query` | 5.84.1 | Server state management and caching |
| `@stripe/stripe-js` | **NEW** | Stripe.js frontend loader |
| `@stripe/react-stripe-js` | **NEW** | Stripe Elements React components |

#### UI & Styling
| Package | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | 3.4.17 | Utility-first CSS |
| `@radix-ui/*` | v1-2 | Accessible UI primitives (20+ packages) |
| `class-variance-authority` | 0.7.1 | CSS class composition |
| `clsx` | 2.1.1 | Conditional CSS classes |
| `tailwind-merge` | 3.0.2 | Tailwind class merging |
| `framer-motion` | 11.16.4 | Animations |
| `lucide-react` | 0.475.0 | Icons |
| `recharts` | 2.15.4 | Charts and graphs |

#### Forms & Validation
| Package | Version | Purpose |
|---------|---------|---------|
| `react-hook-form` | 7.54.2 | Form state management |
| `@hookform/resolvers` | 4.1.2 | Validation resolvers |
| `zod` | 3.24.2 | Schema validation |

#### Utilities
| Package | Version | Purpose |
|---------|---------|---------|
| `date-fns` | 3.6.0 | Date manipulation |
| `qrcode` | 1.5.4 | QR code generation |

#### Testing
| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | 4.1.2 | Unit test runner |
| `playwright` | 1.58.2 | End-to-end browser testing |
| `@testing-library/react` | -- | Component testing utilities |

#### Packages to REMOVE (unused)
| Package | Reason for Removal |
|---------|-------------------|
| `three` / `@react-three/fiber` / `@react-three/drei` | 3D rendering -- never used |
| `leaflet` / `react-leaflet` | Map library -- not used (custom grid map instead) |
| `html2canvas` | Screenshot utility -- not used |
| `jspdf` | PDF generation -- replaced by export approach |
| `react-quill` | Rich text editor -- not used |
| `react-markdown` / `remark-gfm` | Markdown rendering -- not used |
| `canvas-confetti` | Confetti animation -- not used |
| `moment` | Date library -- replaced by date-fns |
| `lodash` | Utility library -- not used |

### 5.4 Supabase Infrastructure Dependencies

| Component | Status | Notes |
|-----------|--------|-------|
| PostgreSQL database | **Active** | 15 tables with RLS, managed via SQL migrations |
| Auth service | **Active** | Email signup (tenants) + magic link OTP (landlords) |
| Storage (`public-assets` bucket) | **Active** | Logo uploads, public read access |
| Edge Functions | **Active** | `send-invoice-email`, `mark-overdue-invoices`, `mark-escalated-requests` |
| Edge Functions (new) | **Required** | `stripe-webhook` (payment confirmation handler) |
| Cron Jobs (pg_cron) | **Active** | Scheduled overdue invoice marking, SLA escalation checks |

### 5.5 Supabase Database Migrations

All schema changes are version-controlled in `supabase/migrations/`:

| Migration | Description |
|-----------|-------------|
| `001_initial_schema.sql` | Core 12 tables with RLS policies |
| `002_units_table.sql` | Units table with auto-status triggers |
| `003_landlord_auth.sql` | Profiles table, `is_landlord()`, `landlord_property_ids()` functions |
| `004_auto_profile_creation.sql` | Auto-create profile on user signup trigger |
| `005_financial_workflows.sql` | Audit log, invoice status constraints |
| `006_stripe_payments.sql` | **NEW** -- Stripe customer/session references on invoices |
| `007_sla_configuration.sql` | **NEW** -- SLA target hours config table, business-hours functions |

---

## 6. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Stripe account approval delays | Medium | High -- blocks payment integration | Client to initiate Stripe application immediately; development uses Stripe test mode |
| Supabase Edge Function cold starts affecting webhook reliability | Low | Medium | Implement idempotent webhook handler with retry logic; Stripe has built-in retry |
| Scope creep from stakeholder feedback during development | Medium | High -- threatens deadline | Scope is fixed per this proposal; change requests handled via separate agreement |
| Supabase free tier rate limits under load | Low | Medium | Monitor usage; upgrade to Pro tier ($25/mo) if needed before launch |
| Email deliverability issues (spam filters) | Medium | Low | Use Resend with verified domain; follow email authentication best practices (SPF, DKIM, DMARC) |
| iOS App Store review rejection (future) | N/A | N/A | Out of scope for this engagement; transition document will address compliance requirements |

---

## 7. Deliverables

Upon completion (May 1, 2026), the following will be delivered:

### 7.1 Application Deliverables
1. **Production-deployed web application** -- fully functional UNIT platform live on configured hosting
2. **Complete source code** -- all code committed to the main branch of the GitHub repository
3. **Database migrations** -- all schema changes versioned in `supabase/migrations/`
4. **CI/CD pipeline** -- GitHub Actions workflow for automated lint, test, build, and deploy

### 7.2 Documentation Deliverables
5. **Updated PRD** -- Product Requirements Document reflecting final implemented state
6. **Deployment runbook** -- Step-by-step guide for environment setup, Supabase configuration, and deployment
7. **iOS Transition Architecture Document** -- Technical roadmap for native iOS app development (see Section 2.3.1)
8. **API & Service Layer Reference** -- Documentation of all 11+ service modules and their methods

### 7.3 Quality Deliverables
9. **Test suite** -- Vitest unit tests + Playwright end-to-end tests covering critical user journeys
10. **Lighthouse audit report** -- Performance, accessibility, SEO scores for production deployment
11. **Accessibility audit summary** -- Findings and remediations applied

---

## 8. iOS App Transition Path

While native iOS development is **out of scope** for this engagement, the architecture of UNIT is designed to facilitate a smooth transition:

### Why Supabase Enables Mobile

The decision to build on **Supabase** (rather than Base44 or a custom backend) was made with mobile expansion in mind:

- **`@supabase/supabase-js` works identically in React Native** -- the same service layer code (`src/services/`) can be reused with zero modifications
- **Auth sessions persist natively** -- Supabase Auth with `AsyncStorage` adapter handles token refresh on iOS automatically
- **Real-time subscriptions** -- Supabase Realtime (WebSocket) works in React Native for live notification delivery
- **Storage uploads** -- The `public-assets` bucket upload flow works from mobile camera/gallery with minor adapter code
- **Row Level Security** -- All access control is enforced server-side, so no additional backend security work is needed for mobile

### Recommended iOS Approach

| Option | Pros | Cons | Timeline |
|--------|------|------|----------|
| **React Native (Expo)** | Reuse ~70% of logic, shared service layer, rapid development | New UI components needed, performance ceiling | 6-8 weeks |
| **Capacitor (wrap existing SPA)** | Reuse ~95% of code, fastest path | Web-view limitations, less native feel | 3-4 weeks |
| **Swift/SwiftUI (native)** | Best performance, full native UX | Complete rewrite of UI + logic, longest timeline | 12-16 weeks |

**Recommendation:** Start with **Capacitor** for an immediate App Store presence, then evaluate a **React Native** rebuild for v2 if native performance or deeper OS integration is required.

### PWA as Bridge (Included in This Engagement)

The Progressive Web App enhancements included in this proposal provide an immediate mobile-like experience:
- Home screen installation on iOS Safari
- Standalone display mode (no browser chrome)
- Offline fallback for read-only views
- This serves as a functional bridge while native development is planned

---

## 9. Assumptions

1. Client will provision all third-party accounts and share access credentials within 3 business days of engagement start.
2. Supabase project is on a plan that supports Edge Functions and sufficient database connections.
3. The existing codebase on the `main` branch is the current source of truth, and no parallel development will conflict with this work.
4. Client will be available for feedback and review within 24 hours on blocking questions.
5. Stripe account approval and verification will be completed by Client before Week 2.
6. Custom domain (if desired) will be registered and DNS access provided by Client.
7. All development, testing, and deployment uses the **Supabase** platform exclusively -- there are no Base44 dependencies, integrations, or migration concerns remaining.

---

## 10. Terms

- **Engagement Period:** April 3 -- May 1, 2026
- **Delivery Date:** May 1, 2026
- **Scope:** Fixed scope as defined in Section 2. Changes require written agreement and may adjust timeline.
- **Communication:** Weekly progress updates with milestone demos
- **Source Control:** All work committed to the agreed GitHub repository
- **Ownership:** All deliverables and intellectual property transfer to Client upon final payment

---

## 11. Acceptance Criteria

The project will be considered complete when:

- [ ] All 38 requirements from the product backlog are implemented and verified
- [ ] Stripe payment flow processes a test transaction end-to-end
- [ ] All 4 analytics dashboard views render accurate data
- [ ] SLA configuration allows per-type target hours with business-hours calculation
- [ ] All 8 transactional email templates deliver successfully via Resend
- [ ] Unused npm dependencies are removed (bundle size reduced by estimated 40%+)
- [ ] Lighthouse performance score is 90+ on production deployment
- [ ] CI/CD pipeline passes lint, test, and build stages
- [ ] Production application is live and accessible on configured domain
- [ ] iOS Transition Architecture Document is delivered and reviewed
- [ ] PWA manifest enables Add-to-Home-Screen on iOS Safari

---

*This proposal is valid for 7 days from the date of preparation. Acceptance constitutes agreement to the scope, timeline, and terms described herein.*
