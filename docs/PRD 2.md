> **DEPRECATED:** This is a historical snapshot of the original PRD from 2026-03-05, before the Supabase migration and brand identity additions. For the current product specification, see [`PRD.md`](./PRD.md).

---

# UNIT Product Requirements Document (Reverse-Engineered)

## Document Metadata
- Product: `UNIT`
- Source of truth: Reverse-engineered from current frontend implementation in this repository
- Version: `1.0`
- Date: `2026-03-05`
- Scope type: As-built behavior (implemented), plus explicit known gaps and inferred roadmap

## 1) Executive Summary
UNIT is a multi-tenant property community web application that connects business tenants within commercial properties. It enables tenants to discover neighboring businesses, publish community updates, submit operational requests, and share digital business profiles. It also provides landlord-facing workflows for tenant request management and basic property accounting operations (leases, recurring payments, invoices, expenses, and reporting).

The system is implemented as a React single-page app backed by Base44 entities and auth services. Navigation is route-based and heavily query-parameter driven (`propertyId`, `id`, and `tab` are core). Core value is split across two personas:
- Tenant/business users: networking, visibility, communication, issue/request submission.
- Property managers/landlords: oversight of requests, lease/payment visibility, and lightweight financial operations.

## 2) Product Vision and Problem Statement
### Vision
Create a property-level operating network where each tenant business has a discoverable digital presence and each property can coordinate communication and operations in one shared application.

### Problem Statement
Commercial properties often lack a unified tenant collaboration and operations interface. Tenant contacts, local discovery, issue tracking, and basic financial operations are typically fragmented across spreadsheets, email, and ad hoc tools.

### Value Proposition
- Tenant growth via local business discovery and engagement.
- Faster coordination through property-specific community posts and requests.
- Landlord efficiency through consolidated request tracking and financial views.

## 3) Product Goals, Non-Goals, and Success Criteria
### Goals
1. Provide an end-to-end tenant onboarding path from property discovery to profile creation.
2. Make every tenant business discoverable in a searchable directory.
3. Enable structured community communication (announcements, events, offers).
4. Enable structured recommendation/request workflows (enhancement, issue, work order).
5. Give landlords a dashboard for occupancy/request/payment/lease visibility.
6. Provide basic accounting workflows and financial report views per property.

### Non-Goals (Current Scope)
1. Advanced IAM/role management for landlord users.
2. Payment processing execution (Stripe dependencies exist but are not wired in code).
3. Document generation or full accounting compliance tooling.
4. Multi-property landlord account switching with secure backend sessions.
5. Full map/CAD floor plans (current map is coordinate-grid visualization).

### Success Criteria (Proposed)
- Tenant onboarding completion rate.
- % tenants with complete profiles.
- Directory search-to-profile-view conversion.
- Community post creation and interaction volume.
- Request resolution cycle time and status progression rates.
- Lease expiry action lead time.
- Revenue collected vs expected monthly rent.

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

### Persona C: Anonymous Visitor
- Jobs:
  - Discover app value from landing.
  - Search for property.
  - Browse property-level information.

## 5) System Context and Dependencies
### Frontend
- React 18 SPA with React Router v6.
- Vite build/dev system.
- Tailwind + shadcn/ui + Radix UI.
- TanStack Query for remote data orchestration.

### Backend/BaaS
- Base44 SDK for:
  - Auth (`isAuthenticated`, `me`, `logout`, `redirectToLogin`)
  - Entity CRUD operations
  - App logging (`logUserInApp`)
  - File upload integration (`Core.UploadFile`)

### Key Runtime Inputs
- `VITE_BASE44_APP_ID`
- `VITE_BASE44_APP_BASE_URL`
- Optional `VITE_BASE44_FUNCTIONS_VERSION`
- URL params can override stored app params (`app_id`, `access_token`, `app_base_url`, etc.).

## 6) Information Architecture and Route Map
Routes are generated from `src/pages.config.js` and mounted in `src/App.jsx`.

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

### Landlord-Oriented Routes
- `/LandlordLogin`
- `/LandlordDashboard?propertyId=<propertyId>`
- `/LandlordRequests?propertyId=<propertyId>`
- `/Accounting?propertyId=<propertyId>&tab=<reports|leases|recurring|invoices|expenses>`

### Error Routes
- wildcard `*` -> custom `PageNotFound`

## 7) End-to-End User Journeys
### Journey 1: Tenant onboarding
1. User arrives at Welcome.
2. Searches property.
3. Selects property and navigates to Register with `propertyId`.
4. Completes two-step business profile form.
5. Optional logo upload to Base44 core upload integration.
6. Business entity created and user navigates to MyCard.

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
1. Landlord enters code on LandlordLogin.
2. Property-matched session key stored in `sessionStorage`.
3. LandlordDashboard loads property metrics.
4. LandlordNotificationBell surfaces urgent items.
5. Landlord navigates to Requests and updates statuses.
6. Landlord navigates to Accounting for reports and record entry.

## 8) Functional Requirements (As-Built)
### FR-1 Property Discovery
- System shall list properties and enable text filtering by name/address/city.
- Selecting a property shall route user to property-scoped flows.

### FR-2 Business Registration
- System shall require `propertyId` for registration.
- System shall create `Business` with tenant contact fields and property linkage.
- System shall support optional logo upload.

### FR-3 Directory
- System shall list property businesses.
- System shall support search and category filters.
- System shall support featured business treatment.
- System shall provide grid and map-like views.

### FR-4 Business Card and Profile
- System shall render a digital business card.
- System shall support QR rendering, download/share/link copy.
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
- System shall create `Notification` records for relevant events (new post/recommendation).
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

## 9) Data Model and Entity Dictionary (Inferred from Usage)
### Property
- Typical fields: `id`, `name`, `address`, `city`, `state`, `type`, `total_units`, `image_url`, `landlord_code`

### Business
- Typical fields: `id`, `property_id`, `owner_email`, `business_name`, `unit_number`, `category`, `business_description`, `contact_name`, `contact_email`, `contact_phone`, `website`, `logo_url`, `is_featured`, `floor_position_x`, `floor_position_y`

### Post
- Typical fields: `id`, `property_id`, `business_id`, `type`, `title`, `content`, `event_date`, `event_time`, `expiry_date`, `image_url`, `created_date`

### Recommendation
- Typical fields: `id`, `property_id`, `business_id`, `type`, `title`, `description`, `category`, `priority`, `status`, `location`, `created_date`

### Notification
- Typical fields: `id`, `user_email`, `property_id`, `type`, `title`, `message`, `related_id`, `read`, `created_date`

### Ad
- Typical fields: `id`, `property_id`, `active`, `headline`, `description`, `image_url`, `cta_link`, `cta_text`, `business_type`, `business_name`, `start_date`, `end_date`

### Lease
- Typical fields: `id`, `property_id`, `business_id`, `unit_number`, `start_date`, `end_date`, `monthly_rent`, `security_deposit`, `status`, `notes`

### RecurringPayment
- Typical fields: `id`, `property_id`, `business_id`, `lease_id`, `name`, `amount`, `frequency`, `start_date`, `day_of_month`, `status`, `auto_generate_invoice`, `created_date`

### Invoice
- Typical fields: `id`, `property_id`, `business_id`, `lease_id`, `invoice_number`, `invoice_date`, `due_date`, `amount`, `description`, `status`

### Expense
- Typical fields: `id`, `property_id`, `category`, `description`, `amount`, `expense_date`, `vendor`, `payment_method`, `notes`

### Payment
- Typical fields: `id`, `property_id`, `business_id`, `amount`, `status`, `due_date`, `paid_date`

## 10) Auth, Access Control, and Session Model
### Application auth
- App bootstraps by checking Base44 public settings.
- If auth required and no valid token, app redirects to Base44 login.
- If user not registered, app shows restricted-access view.

### Tenant auth/identity
- User identity fetched from Base44 auth.
- Business ownership typically linked by `owner_email`.

### Landlord auth/session
- Landlord access uses property `landlord_code` validation on client.
- Session stored in browser `sessionStorage` with `landlord_property_id`.
- Dashboard checks session-property match.

### Security Note
- Landlord authentication is currently lightweight and client-session based; stronger server-validated role controls are recommended.

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
### As-built UX patterns
- Mobile-first bottom navigation for tenant pages.
- Fixed headers and gradient-themed visual style.
- Framer Motion transitions and reveal animations.

### Component system
- shadcn/ui + Radix primitives.
- Tailwind utility styling with CSS-variable theme tokens.

## 14) Non-Functional Requirements (Current + Target)
### Current Characteristics
- Client-side data fetching with query caching.
- Basic retries on query failures.
- No explicit automated test suite in repository.
- No explicit monitoring/telemetry beyond app page logging.

### Target NFR Recommendations
- Security: server-validated landlord roles and scoped API authorization.
- Reliability: error boundaries and offline-safe fallback states.
- Performance: route-level code splitting and image optimization.
- Accessibility: consistent semantic labeling and keyboard focus audits.
- Observability: structured event tracking for key funnels.

## 15) Operational and Deployment Model
### Local development
- Install dependencies and run with Vite.
- Configure Base44 env variables in `.env.local`.

### Publishing model
- Repo is synced with Base44 Builder workflow.
- Publish process performed through Base44 UI.

## 16) Risks, Gaps, and Constraints
1. Landlord authentication is code-based and stored in client session; role hardening needed.
2. Accounting route access control appears lighter than dashboard guard pattern.
3. Stripe dependencies are present but no active integration flow in source.
4. QR code generation is visual/deterministic rather than standards-compliant encoded QR library usage.
5. No explicit backend-in-repo validation rules or schema migrations are visible.
6. No first-party automated test suite in repository.
7. Hardcoded static values and assets exist (e.g., marketing stats/logo asset references).

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

## 18) Suggested Product Backlog (Prioritized)
### P0
1. Harden landlord authentication and authorization server-side.
2. Enforce access checks uniformly for all landlord routes.
3. Add audit trail for request status changes and financial record mutations.

### P1
1. Replace pseudo-QR rendering with standards-compliant QR generation.
2. Add workflow for invoice-to-payment lifecycle updates.
3. Add route-level guards and centralized role middleware pattern.

### P2
1. Integrate Stripe payments if payment collection is in scope.
2. Add richer analytics and operational dashboards.
3. Add export capabilities for accounting data.

## 19) Open Questions for Stakeholder Review
1. Should landlord access remain code-based or migrate to user-role accounts?
2. What accounting depth is required (bookkeeping vs operational summaries)?
3. Should recommendations support SLA targets and assignment?
4. Should notifications include email/SMS channels?
5. Is multi-property landlord switching required in one session?

## 20) Scope Integrity Statement
This PRD documents current implemented behavior in the repository and intentionally distinguishes confirmed implementation from inferred roadmap opportunities. It is designed to be executable for product planning and engineering alignment without introducing assumptions as hard requirements.
