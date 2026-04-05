# UNIT Product Requirements Document

## Document Metadata
- Product: `UNIT`
- Source of truth: Reverse-engineered from current frontend implementation, Supabase migrations, and service layer
- Version: `2.0`
- Date: `2026-03-26`
- Scope type: As-built behavior (implemented), plus explicit known gaps and inferred roadmap

## 1) Executive Summary
UNIT is a multi-tenant property community web application that connects business tenants within commercial properties. It enables tenants to discover neighboring businesses, publish community updates, submit operational requests, and share digital business profiles. It also provides landlord-facing workflows for tenant request management, unit management, audit logging, and basic property accounting operations (leases, recurring payments, invoices, expenses, and reporting).

The system is implemented as a React single-page app backed by Supabase (PostgreSQL database, Auth, Storage, and Row Level Security). Navigation is route-based and heavily query-parameter driven (`propertyId`, `id`, and `tab` are core). Core value is split across two personas:
- Tenant/business users: networking, visibility, communication, issue/request submission.
- Property managers/landlords: oversight of requests, lease/payment visibility, lightweight financial operations, unit management, multi-property switching, and audit trail visibility.

## 2) Product Vision and Problem Statement
### Vision
Create a property-level operating network where each tenant business has a discoverable digital presence and each property can coordinate communication and operations in one shared application.

### Problem Statement
Commercial properties often lack a unified tenant collaboration and operations interface. Tenant contacts, local discovery, issue tracking, and basic financial operations are typically fragmented across spreadsheets, email, and ad hoc tools.

### Value Proposition
- Tenant growth via local business discovery and engagement.
- Faster coordination through property-specific community posts and requests.
- Landlord efficiency through consolidated request tracking and financial views.
- Accountability through append-only audit logging of financial and operational mutations.

## 3) Product Goals, Non-Goals, and Success Criteria
### Goals
1. Provide an end-to-end tenant onboarding path from property discovery to profile creation.
2. Make every tenant business discoverable in a searchable directory.
3. Enable structured community communication (announcements, events, offers).
4. Enable structured recommendation/request workflows (enhancement, issue, work order).
5. Give landlords a dashboard for occupancy/request/payment/lease visibility.
6. Provide basic accounting workflows and financial report views per property.
7. Provide multi-property landlord switching within a single authenticated session.
8. Maintain an append-only audit trail for all landlord-initiated data mutations.
9. Track unit-level occupancy with automatic status management.

### Non-Goals (Current Scope)
1. Payment processing execution (Stripe packages are installed but not imported or wired).
2. Document generation or full accounting compliance tooling.
3. Full map/CAD floor plans (current map is coordinate-grid visualization).
4. Email/SMS notification delivery channels (notifications are in-app only).
5. SLA-based request assignment or escalation workflows.

### Success Criteria (Proposed)
- Tenant onboarding completion rate.
- % tenants with complete profiles.
- Directory search-to-profile-view conversion.
- Community post creation and interaction volume.
- Request resolution cycle time and status progression rates.
- Lease expiry action lead time.
- Revenue collected vs expected monthly rent.
- Audit log coverage across all mutation paths.
- Unit vacancy-to-occupied turnaround time.

## 4) Personas and Primary Jobs
### Persona A: Tenant Business Owner
- Jobs:
  - Register business presence in the property.
  - Discover neighboring businesses.
  - Share updates/offers/events.
  - Submit operational requests.
  - Share profile and contact information via QR/link.

### Persona B: Property Landlord/Manager
- Jobs:
  - Monitor property occupancy and tenant mix.
  - Review and update tenant requests.
  - Track lease terms and upcoming expirations.
  - Track payment, invoice, recurring charge, and expense records.
  - View simplified financial reports.
  - Manage unit inventory and occupancy status.
  - Switch between multiple managed properties.
  - Review audit trail for operational accountability.

### Persona C: Anonymous Visitor
- Jobs:
  - Discover app value from landing.
  - Search for property.
  - Browse property-level information.

## 5) System Context and Dependencies
### Frontend
- React 18.2.0 SPA with React Router DOM v6.26.0.
- Vite 6.1.0 build/dev system.
- Tailwind CSS 3.4.17 + shadcn/ui + Radix UI (20+ component packages).
- TanStack React Query 5.84.1 for remote data orchestration.
- React Hook Form 7.54.2 + Zod 3.24.2 for form state and validation.
- Framer Motion 11.16.4 for animations.
- Recharts 2.15.4 for charts and graphs.
- `qrcode` 1.5.4 for standards-compliant QR code generation.
- Lucide React 0.475.0 for iconography.

### Backend/BaaS
- Supabase JS 2.100.0 (`@supabase/supabase-js`) for:
  - Auth (session management via `onAuthStateChange`, magic link via `signInWithOtp`)
  - PostgreSQL database with Row Level Security on all tables
  - Storage (`public-assets` bucket for file uploads)
- Service layer at `src/services/` with 11 modules wrapping Supabase client calls.
- Database schema managed via SQL migrations in `supabase/migrations/`.
- PostgreSQL helper functions: `is_landlord()`, `landlord_property_ids()` for RLS policy enforcement.

### Key Runtime Inputs
- `VITE_SUPABASE_URL` -- Supabase project URL
- `VITE_SUPABASE_ANON_KEY` -- Supabase anonymous/public API key

## 6) Information Architecture and Route Map
Routes are generated from `src/pages.config.js` and mounted in `src/App.jsx`. Landlord routes are wrapped in `LandlordGuard` and `PropertyProvider` components.

### Public/Shared Routes
- `/` -> Welcome landing (`mainPage`)
- `/Welcome`
- `/BrowseProperties`
- `/Profile?id=<businessId>`

### Tenant-Oriented Routes
- `/Register?propertyId=<propertyId>`
- `/Directory?propertyId=<propertyId>`
- `/Community?propertyId=<propertyId>`
- `/Recommendations?propertyId=<propertyId>`
- `/MyCard` or `/MyCard?businessId=<businessId>&propertyId=<propertyId>&tab=profile`

### Landlord-Oriented Routes (LandlordGuard + PropertyProvider)
- `/LandlordLogin`
- `/LandlordDashboard?propertyId=<propertyId>`
- `/LandlordRequests?propertyId=<propertyId>`
- `/Accounting?propertyId=<propertyId>&tab=<reports|leases|recurring|invoices|expenses>`
- `/AuditPage`

### Error Routes
- wildcard `*` -> custom `PageNotFound`

## 7) End-to-End User Journeys
### Journey 1: Tenant onboarding
1. User arrives at Welcome.
2. Searches property.
3. Selects property and navigates to Register with `propertyId`.
4. Completes two-step business profile form.
5. Optional logo upload to Supabase Storage `public-assets` bucket.
6. Business record created and user navigates to MyCard.

### Journey 2: Tenant discovery and networking
1. Tenant opens Directory with `propertyId`.
2. Uses search and category filters.
3. Views businesses in grid or floor map mode.
4. Opens business card modal with contact and QR-share options.
5. Can drill into Profile page and navigate to Directory/Community from profile.

### Journey 3: Community communication
1. Tenant with a business profile opens Community.
2. Filters posts by type.
3. Creates post (announcement/event/offer).
4. System creates notifications for other businesses in same property.

### Journey 4: Recommendations/requests
1. Tenant with a business profile opens Recommendations.
2. Creates enhancement/issue/work_order using modal.
3. System creates notifications for other businesses.
4. Request appears in tenant list and landlord request queue.

### Journey 5: Landlord access and operations
1. Landlord navigates to LandlordLogin.
2. Enters email address; system sends magic link via `supabase.auth.signInWithOtp()`.
3. Landlord clicks magic link in email, completing authentication.
4. AuthContext detects session via `supabase.auth.onAuthStateChange()`.
5. LandlordGuard verifies `profiles.role = 'landlord'` and grants access.
6. PropertySwitcher allows selection among properties listed in `profiles.property_ids`.
7. LandlordDashboard loads property metrics for the active property.
8. LandlordNotificationBell surfaces urgent items.
9. Landlord navigates to Requests and updates statuses.
10. Landlord navigates to Accounting for reports and record entry.
11. Landlord navigates to AuditPage to review mutation history with filters.

### Journey 6: Audit review
1. Landlord navigates to AuditPage.
2. Filters audit entries by entity type, action, or performer email.
3. Reviews timeline of mutations with old/new value diffs.

## 8) Functional Requirements (As-Built)
### FR-1 Property Discovery
- System shall list properties and enable text filtering by name/address/city.
- Selecting a property shall route user to property-scoped flows.

### FR-2 Business Registration
- System shall require `propertyId` for registration.
- System shall create `businesses` record with tenant contact fields, property linkage, and optional `unit_id`.
- System shall support optional logo upload via Supabase Storage.

### FR-3 Directory
- System shall list property businesses.
- System shall support search and category filters.
- System shall support featured business treatment.
- System shall provide grid and map-like views.

### FR-4 Business Card and Profile
- System shall render a digital business card.
- System shall support standards-compliant QR code rendering (using `qrcode` 1.5.4), download/share/link copy.
- System shall support editing business profile from MyCard.

### FR-5 Community Posts
- System shall list posts by property in reverse chronology.
- System shall support post creation for authenticated users with an associated business.
- System shall support post types with type-specific fields:
  - event: `event_date`, `event_time`
  - offer: `expiry_date`

### FR-6 Recommendations
- System shall list recommendations by property.
- System shall support types: `enhancement`, `issue`, `work_order`.
- System shall support status progression including `submitted`, `in_progress`, `resolved`, `closed`.
- System shall enforce business-profile requirement before submission.

### FR-7 Notifications (Tenant)
- System shall create `notifications` records for relevant events (new post/recommendation).
- System shall list notifications by `user_email + property_id`.
- System shall support mark-read and mark-all-read.

### FR-8 Landlord Dashboard
- System shall show occupancy, tenant count, expected revenue, monthly collected amount, expiring leases.
- System shall display tenant category distribution.
- System shall provide quick navigation to request management.

### FR-9 Landlord Notifications
- System shall synthesize landlord alerts for:
  - submitted requests
  - overdue payments
  - leases expiring within threshold
- System shall allow dismissal persistence via `localStorage`.

### FR-10 Request Management
- System shall list all recommendations for property.
- System shall allow landlord status updates per request.
- System shall show summary counters by status and priority.

### FR-11 Accounting Operations
- System shall provide tabbed accounting views:
  - reports
  - leases
  - recurring payments
  - invoices
  - expenses
- System shall support create/update flows via modals for core entities.
- System shall show basic computed summaries and charts.

### FR-12 Audit Logging
- System shall maintain an append-only `audit_log` table (no update or delete permitted by RLS).
- System shall record mutations via `writeAudit()` in `src/lib/AuditLogger.js`.
- System shall capture: entity_type, entity_id, action, old_value (jsonb), new_value (jsonb), performed_by_user_id, performed_by_email, performed_at.
- Supported entity types: recommendation, invoice, lease, expense, payment, recurring_payment.
- Supported actions: created, updated, deleted, status_changed.
- System shall provide AuditPage with filters for entity type, action, and performer email.
- System shall render audit entries in a timeline view.

### FR-13 Units Management
- System shall maintain a `units` table with unit_number, address fields, building, and status.
- Unit status values: vacant, occupied, maintenance.
- System shall enforce unique constraint on (property_id, unit_number).
- System shall automatically update unit status via database trigger when businesses are assigned to or removed from units.
- Service module: `src/services/units.js`.

### FR-14 Multi-Property Landlord
- System shall support landlords managing multiple properties in a single session.
- `profiles.property_ids` (uuid array) defines the set of properties a landlord can access.
- PropertySwitcher component provides dropdown selection among assigned properties.
- LandlordGuard component wraps all landlord routes in App.jsx, verifying role and property access.
- PropertyProvider manages the active property context for downstream components.

## 9) Data Model and Entity Dictionary
All tables reside in a Supabase PostgreSQL database. Row Level Security is enabled on every table. Schema is managed via SQL migrations in `supabase/migrations/`.

### properties
- `id` (uuid, PK), `name`, `address`, `city`, `state`, `type`, `total_units`, `image_url`, `landlord_code` (nullified -- legacy field, trigger prevents future writes), `created_at`

### businesses
- `id` (uuid, PK), `property_id` (FK properties), `owner_email`, `business_name`, `unit_number`, `category`, `business_description`, `contact_name`, `contact_email`, `contact_phone`, `website`, `logo_url`, `is_featured`, `floor_position_x`, `floor_position_y`, `unit_id` (FK units), `created_at`

### posts
- `id` (uuid, PK), `property_id` (FK properties), `business_id` (FK businesses), `type`, `title`, `content`, `event_date`, `event_time`, `expiry_date`, `image_url`, `created_date`

### recommendations
- `id` (uuid, PK), `property_id` (FK properties), `business_id` (FK businesses), `type`, `title`, `description`, `category`, `priority`, `status`, `location`, `created_date`

### notifications
- `id` (uuid, PK), `user_email`, `property_id` (FK properties), `type`, `title`, `message`, `related_id`, `read`, `created_date`
- RLS: users can only access rows where `user_email` matches their own.

### ads
- `id` (uuid, PK), `property_id` (FK properties), `active`, `headline`, `description`, `image_url`, `cta_link`, `cta_text`, `business_type`, `business_name`, `start_date`, `end_date`, `created_at`

### leases
- `id` (uuid, PK), `property_id` (FK properties), `business_id` (FK businesses), `unit_number`, `unit_id` (FK units), `start_date`, `end_date`, `monthly_rent`, `security_deposit`, `status`, `notes`, `created_at`
- RLS: landlord-scoped via `is_landlord()` AND `property_id = any(landlord_property_ids())`.

### recurring_payments
- `id` (uuid, PK), `property_id` (FK properties), `business_id` (FK businesses), `lease_id` (FK leases), `name`, `amount`, `frequency`, `start_date`, `day_of_month`, `status`, `auto_generate_invoice`, `created_date`
- RLS: landlord-scoped via `is_landlord()` AND `property_id = any(landlord_property_ids())`.

### invoices
- `id` (uuid, PK), `property_id` (FK properties), `business_id` (FK businesses), `lease_id` (FK leases), `invoice_number`, `invoice_date`, `due_date`, `amount`, `description`, `status`, `created_at`
- RLS: landlord-scoped via `is_landlord()` AND `property_id = any(landlord_property_ids())`.

### expenses
- `id` (uuid, PK), `property_id` (FK properties), `category`, `description`, `amount`, `expense_date`, `vendor`, `payment_method`, `notes`, `created_at`
- RLS: landlord-scoped via `is_landlord()` AND `property_id = any(landlord_property_ids())`.

### payments
- `id` (uuid, PK), `property_id` (FK properties), `business_id` (FK businesses), `amount`, `status`, `due_date`, `paid_date`, `created_at`
- RLS: landlord-scoped via `is_landlord()` AND `property_id = any(landlord_property_ids())`.

### units
- `id` (uuid, PK), `property_id` (FK properties), `unit_number`, `street_address`, `city`, `state`, `zip`, `building`, `status` (vacant/occupied/maintenance), `created_at`
- Unique constraint: `(property_id, unit_number)`.
- Auto-status trigger: status updates when businesses are assigned or removed.

### profiles
- `id` (uuid, PK, FK auth.users), `role` (tenant/landlord), `property_ids` (uuid[]), `email`, `created_at`
- RLS: users can read their own row; service_role manages all rows.
- Auto-creation trigger on user signup (defaults to tenant role).

### audit_log
- `id` (uuid, PK), `entity_type`, `entity_id`, `action`, `old_value` (jsonb), `new_value` (jsonb), `performed_by_user_id`, `performed_by_email`, `performed_at`
- RLS: append-only -- landlords can insert and read, no update or delete permitted.

### activity_logs
- `id` (uuid, PK), `user_id` (FK auth.users), `page_name`, `created_at`
- RLS: users can only access their own rows.

## 10) Auth, Access Control, and Session Model
### Tenant authentication
- Users authenticate via Supabase Auth sessions.
- Session state is managed in `src/lib/AuthContext.jsx` via `supabase.auth.onAuthStateChange()`.
- On signup, a database trigger automatically creates a `profiles` row with `role = 'tenant'`.
- Business ownership is linked by `owner_email` matching the authenticated user's email.

### Landlord authentication
- Landlords authenticate via email magic link using `supabase.auth.signInWithOtp()` in `LandlordLogin.jsx`.
- The `profiles` table stores `role = 'landlord'` and `property_ids` (uuid array) for property access.
- The legacy `landlord_code` field on the `properties` table has been nullified; a database trigger prevents future writes to this column.

### Route protection
- `LandlordGuard` component wraps all landlord routes in `App.jsx`, verifying the user's profile has `role = 'landlord'`.
- `PropertyProvider` manages the active property context within the landlord route tree.
- `PropertySwitcher` dropdown enables landlords to switch between properties in their `property_ids` array.

### Row Level Security
- All 15 tables have RLS policies enabled.
- Financial tables (leases, recurring_payments, invoices, expenses, payments) are landlord-scoped using PostgreSQL helper functions `is_landlord()` and `landlord_property_ids()`.
- `profiles`: users can read their own row; `service_role` manages all.
- `audit_log`: append-only (landlords can insert and read; no update or delete).
- `notifications`: scoped to rows where `user_email` matches the authenticated user.
- `activity_logs`: scoped to rows where `user_id` matches the authenticated user.

### Session management
- All session state is managed by Supabase Auth (JWT-based, persisted automatically by the Supabase JS client).
- No `sessionStorage` or `localStorage` is used for authentication tokens.
- Landlord notification dismissal state is persisted in `localStorage` per property.

## 11) Notifications and Eventing Rules
### Triggered events implemented
- New community post -> notifications to other businesses in property.
- New recommendation -> notifications to other businesses in property.

### Tenant notification interaction
- Inbox panel with unread badge.
- Per-item and bulk mark-as-read.

### Landlord notification interaction
- Derived notifications from existing entities (not persisted notification objects in same flow).
- Dismissal state per property persisted locally.

## 12) Reporting and Financial Logic (Current)
### Metrics and calculations
- Occupancy rate = `businesses.length / total_units`.
- Expected monthly revenue = sum of active lease monthly rent.
- Collected monthly revenue = sum of paid payments in current month.
- Expiring leases windows:
  - dashboard: 90 days
  - notification synthesis: 60 days

### Financial reports module
- Profit and loss: paid revenue vs expenses in date range.
- Cash flow: monthly inflow/outflow/net.
- Balance sheet (simplified): assets as collected revenue, liabilities as security deposits, equity as difference.

## 13) UX and Design System Requirements
### Brand Identity
- Logo: Four connected human figures in a square formation, gradient navy-to-steel-blue.
- Tagline: "Where Tenants Connect".
- Brand palette: Dark Navy (#101B29), Deep Blue (#1D263A), Slate Blue (#465A75), Light Steel Blue (#7C8DA7), Soft Light Gray (#E0E1DE).
- Full brand guidelines documented in `docs/BRAND.md`.

### Semantic color system
- Centralized in `src/lib/colors.js` with named exports: BRAND, STATUS_COLORS, PRIORITY_COLORS, FINANCIAL_COLORS, CHART_COLORS, CATEGORY_COLORS, CATEGORY_GRADIENTS.
- CSS variables in `src/index.css` for shadcn/ui theming (light + dark mode support).

### As-built UX patterns
- Mobile-first bottom navigation for tenant pages.
- Fixed headers and gradient-themed visual style using brand palette.
- Framer Motion transitions and reveal animations.
- PropertySwitcher dropdown in landlord header for multi-property navigation.

### Component system
- shadcn/ui + Radix primitives (20+ component packages).
- Tailwind utility styling with CSS-variable theme tokens mapped to brand colors.
- Direct brand color tokens available via `brand-navy`, `brand-navy-light`, `brand-blue`, `brand-slate`, `brand-slate-light`, `brand-steel`, `brand-gray` Tailwind classes.

## 14) Non-Functional Requirements (Current + Target)
### Current Characteristics
- Client-side data fetching with TanStack React Query caching (refetchOnWindowFocus: false, retry: 1).
- Row Level Security on all 15 database tables enforced at the Supabase layer.
- Server-validated landlord roles via `is_landlord()` PostgreSQL function. [RESOLVED from v1.0]
- Centralized landlord route protection via LandlordGuard component. [RESOLVED from v1.0]
- Append-only audit logging for financial and operational mutations. [RESOLVED from v1.0]
- Standards-compliant QR code generation via `qrcode` library. [RESOLVED from v1.0]
- Database schema managed via SQL migrations in `supabase/migrations/`. [RESOLVED from v1.0]
- No explicit automated test suite in repository.
- No explicit monitoring/telemetry beyond activity_logs page tracking.

### Target NFR Recommendations
- Reliability: add React error boundaries for graceful failure handling.
- Performance: route-level code splitting and image optimization.
- Accessibility: consistent semantic labeling and keyboard focus audits.
- Observability: structured event tracking for key funnels.
- Testing: establish automated test suite (unit and integration).
- Cleanup: remove 11+ unused dependencies (Stripe, Three.js, Leaflet, html2canvas, jsPDF, React Quill, React Markdown, canvas-confetti, moment, lodash).
- Cleanup: consolidate dual toast systems (sonner + react-hot-toast) to a single library.
- Reliability: deduplicate currentUser query pattern (currently repeated in 5+ pages).

## 15) Operational and Deployment Model
### Local development
- Install dependencies via `npm install`.
- Run dev server with `npm run dev` (Vite).
- Configure Supabase env variables in `.env.local`:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### Build and deploy
- Static SPA build via `npm run build` (Vite).
- Deploy `dist/` directory to any static hosting provider (Vercel, Netlify, Cloudflare Pages, etc.).

### Infrastructure requirements
- Supabase project with:
  - PostgreSQL database (schema applied from `supabase/migrations/`)
  - Auth service configured for magic link (email OTP)
  - Storage bucket named `public-assets` (public read access)
- No custom backend server required; all server-side logic is in PostgreSQL functions and RLS policies.

## 16) Risks, Gaps, and Constraints
1. [RESOLVED] ~~Landlord authentication is code-based and stored in client session.~~ Replaced with Supabase Auth magic link, server-validated roles via `is_landlord()`, and RLS enforcement.
2. [RESOLVED] ~~Accounting route access control appears lighter than dashboard guard pattern.~~ All landlord routes now wrapped in LandlordGuard with RLS on all financial tables.
3. Stripe dependencies are present (packages installed) but no active integration flow in source. Unused packages should be removed if payment processing is not planned.
4. [RESOLVED] ~~QR code generation is visual/deterministic rather than standards-compliant.~~ Now uses `qrcode` 1.5.4 library.
5. [RESOLVED] ~~No explicit backend-in-repo validation rules or schema migrations are visible.~~ Schema managed via `supabase/migrations/`.
6. No first-party automated test suite in repository.
7. Some hardcoded static values and assets remain (e.g., marketing stats/logo asset references).
8. 11+ unused npm dependencies add bundle size and maintenance burden (Stripe, Three.js, Leaflet, html2canvas, jsPDF, React Quill, React Markdown, canvas-confetti, moment, lodash).
9. Dual toast notification systems (sonner + react-hot-toast) create inconsistency; should consolidate.
10. No React error boundaries; unhandled component errors crash the entire app.
11. Duplicated currentUser query pattern in 5+ page components; should extract to a shared hook.
12. Audit logging infrastructure exists but may not be wired into all mutation paths yet; coverage audit recommended.

## 17) Acceptance Criteria (High-Level, Per Capability)
### Tenant onboarding
- Given a valid property selection, user can create business profile and land on MyCard.

### Directory
- Given a property with businesses, users can search/filter and open business card details.

### Community
- Given a user with business in property, user can create typed posts and see them in feed.

### Recommendations
- Given a registered business user, user can submit request with type/category/priority.
- Landlord can update status and changes are reflected in list.

### Accounting
- Landlord can create lease, recurring payment, invoice, and expense records and view report outputs.

### Audit Logging
- Given a landlord on AuditPage, user can filter audit entries by entity type, action, and performer email.
- Audit entries display old_value and new_value diffs in a timeline.
- Audit log rows cannot be updated or deleted (append-only enforcement via RLS).

### Units Management
- Given a property, landlord can create units with unique unit numbers.
- Unit status automatically updates to occupied when a business is assigned and to vacant when removed.

### Multi-Property Landlord
- Given a landlord with multiple property_ids, PropertySwitcher displays all assigned properties.
- Selecting a different property updates the active context and reloads data for that property.

### Landlord Auth
- Given a landlord email, system sends magic link and authenticates on click.
- Non-landlord users are blocked from landlord routes by LandlordGuard.

## 18) Suggested Product Backlog (Prioritized)
### P0
1. [DONE] ~~Harden landlord authentication and authorization server-side.~~ Supabase Auth + RLS + `is_landlord()` function.
2. [DONE] ~~Enforce access checks uniformly for all landlord routes.~~ LandlordGuard wraps all landlord routes.
3. [DONE] ~~Add audit trail for request status changes and financial record mutations.~~ Audit logging implemented (FR-12).

### P1
1. [DONE] ~~Replace pseudo-QR rendering with standards-compliant QR generation.~~ Using `qrcode` 1.5.4.
2. Add workflow for invoice-to-payment lifecycle updates.
3. [DONE] ~~Add route-level guards and centralized role middleware pattern.~~ LandlordGuard + PropertyProvider.
4. Wire audit logging into all remaining mutation paths (coverage audit needed).
5. Extract duplicated currentUser query into a shared `useCurrentUser` hook.

### P2
1. Integrate Stripe payments if payment collection is in scope (or remove unused Stripe packages).
2. Add richer analytics and operational dashboards.
3. Add export capabilities for accounting data.
4. Add React error boundaries for graceful failure handling.
5. Remove unused dependencies (Three.js, Leaflet, html2canvas, jsPDF, React Quill, React Markdown, canvas-confetti, moment, lodash).
6. Consolidate dual toast systems to a single library.
7. Establish automated test suite (unit and integration).

## 19) Open Questions for Stakeholder Review
1. [ANSWERED] ~~Should landlord access remain code-based or migrate to user-role accounts?~~ Migrated to Supabase Auth with `profiles.role` and magic link authentication.
2. What accounting depth is required (bookkeeping vs operational summaries)?
3. Should recommendations support SLA targets and assignment?
4. Should notifications include email/SMS channels?
5. [ANSWERED] ~~Is multi-property landlord switching required in one session?~~ Yes, implemented via PropertySwitcher and `profiles.property_ids`.
6. Should Stripe payment processing be implemented, or should unused Stripe packages be removed?
7. What is the desired audit log retention policy?

## 20) Scope Integrity Statement
This PRD documents current implemented behavior in the repository and intentionally distinguishes confirmed implementation from inferred roadmap opportunities. It is designed to be executable for product planning and engineering alignment without introducing assumptions as hard requirements. All backend behavior is defined by Supabase PostgreSQL schema, RLS policies, and database triggers as managed in `supabase/migrations/`.
