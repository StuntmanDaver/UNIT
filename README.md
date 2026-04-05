# UNIT

UNIT is a multi-tenant property community web application that connects business tenants within commercial properties. It enables tenants to discover neighboring businesses, publish community updates, submit operational requests, and share digital business profiles. It also provides landlord-facing workflows for tenant request management, audit logging, and basic property accounting. Built as a React SPA backed by Supabase (PostgreSQL, Auth, Storage).

For a full product specification, see `docs/PRD.md`.

## Table of Contents
- [Product Overview](#product-overview)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Available Scripts](#available-scripts)
- [Routes and Navigation](#routes-and-navigation)
- [Data Model](#data-model)
- [Auth and Access Model](#auth-and-access-model)
- [Service Layer](#service-layer)
- [Accounting Module](#accounting-module)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Known Gaps](#known-gaps)

## Product Overview
UNIT connects businesses within the same commercial property and provides landlord-facing operational tooling.

### Tenant experience
- Find and select a property.
- Register a business profile.
- Discover neighboring businesses in the directory.
- Share community content (announcements, events, offers).
- Submit property recommendations, issues, and work orders.
- Share business profile via QR code or link.

### Landlord experience
- Login via email magic link (Supabase OTP).
- Switch between multiple properties (PropertySwitcher).
- Monitor occupancy, requests, payments, and lease risk.
- Update recommendation and request statuses.
- Manage lease, recurring charge, invoice, and expense records.
- View financial reports and trends.
- Review append-only audit log of landlord actions.

## Core Features

### 1) Property Discovery
- Property search and browse flows.
- Property-scoped experience using `propertyId`.

### 2) Business Registration and Profile
- Two-step registration with contact info and category.
- Optional logo upload via Supabase Storage (`public-assets` bucket).
- MyCard profile editing and QR sharing.

### 3) Directory and Floor View
- Search and filter businesses.
- Featured business treatment.
- Grid and map-like coordinate layout.

### 4) Community
- Post types: `announcement`, `event`, `offer`.
- Type-specific fields for events and offers.
- Property-level feed.

### 5) Recommendations (Requests)
- Types: `enhancement`, `issue`, `work_order`.
- Status lifecycle: `submitted`, `in_progress`, `resolved`, `closed`.
- Priority support: `low`, `medium`, `high`.

### 6) Notifications
- Tenant inbox from persisted notification records.
- Landlord synthesized alert panel from requests, payments, and leases.

### 7) Accounting
- Reports tab with P&L, cash flow, and simplified balance sheet.
- Lease create and update.
- Recurring payment creation.
- Invoice generation.
- Expense recording.

### 8) Units Management
- Track units per property with status (occupied, vacant, maintenance).
- Auto-status trigger updates unit status based on lease activity.

### 9) Audit Logging
- Append-only `audit_log` table records landlord actions.
- AuditPage with filters and timeline view.
- Powered by `AuditLogger.writeAudit()`.

## Tech Stack
- Runtime: React 18.2.0
- Routing: React Router DOM 6.26.0
- Data orchestration: TanStack React Query 5.84.1
- Backend: Supabase JS 2.100.0 (database, auth, storage)
- Build tool: Vite 6.1.0
- Styling: Tailwind CSS 3.4.17 + shadcn/ui (49 components) + Radix UI
- Forms: React Hook Form 7.54.2 + Zod 3.24.2
- Animations: Framer Motion 11.16.4
- Charts: Recharts 2.15.4
- QR codes: qrcode 1.5.4
- Icons: Lucide React
- Dates: date-fns 3.6.0

## Architecture

### Application shell
- Entry: `src/main.jsx`
- Root app: `src/App.jsx`
- Dynamic route registration: `src/pages.config.js`

### Core infrastructure modules
- Supabase client singleton: `src/services/supabaseClient.js`
- Auth context and session management: `src/lib/AuthContext.jsx`
- Property context for multi-property landlords: `src/lib/PropertyContext.jsx`
- Audit logging utility: `src/lib/AuditLogger.js`
- Brand and semantic color maps: `src/lib/colors.js`
- Query client: `src/lib/query-client.js`
- Navigation activity logging: `src/lib/NavigationTracker.jsx`
- 404 page: `src/lib/PageNotFound.jsx`

### Service layer
All data access goes through `src/services/`, which wraps Supabase queries into focused modules:
- `properties.js` -- list, getById, filter
- `businesses.js` -- filter, getById, create, update
- `posts.js` -- filter (with ordering), create
- `recommendations.js` -- filter (with ordering), create, update
- `notifications.js` -- filter (with limit), create, update, markAllRead
- `accounting.js` -- factory pattern producing 5 services (leases, recurringPayments, invoices, expenses, payments), each with filter, create, update, delete
- `ads.js` -- filter
- `storage.js` -- uploadFile (to `public-assets` bucket, returns public URL)
- `activityLogs.js` -- logPageVisit (fire-and-forget)
- `units.js` -- listByProperty, getVacant, getById, updateStatus

### UI architecture
- `src/pages/` -- 13 route-level page components.
- `src/components/` -- feature components (modals, cards, bells, guards).
- `src/components/ui/` -- 49 shadcn/Radix primitives.
- `src/components/guards/` -- route protection (LandlordGuard).
- `src/components/accounting/` -- accounting feature components.

## Repository Structure
```text
.
├── src/
│   ├── services/
│   │   ├── supabaseClient.js
│   │   ├── properties.js
│   │   ├── businesses.js
│   │   ├── posts.js
│   │   ├── recommendations.js
│   │   ├── notifications.js
│   │   ├── accounting.js
│   │   ├── ads.js
│   │   ├── storage.js
│   │   ├── activityLogs.js
│   │   └── units.js
│   ├── components/
│   │   ├── accounting/
│   │   ├── guards/
│   │   ├── ui/
│   │   ├── BottomNav.jsx
│   │   ├── PropertySwitcher.jsx
│   │   ├── AuditLogEntry.jsx
│   │   ├── AuditLogTimeline.jsx
│   │   └── ...
│   ├── lib/
│   │   ├── AuthContext.jsx
│   │   ├── PropertyContext.jsx
│   │   ├── AuditLogger.js
│   │   ├── colors.js
│   │   ├── query-client.js
│   │   ├── NavigationTracker.jsx
│   │   ├── PageNotFound.jsx
│   │   └── utils.js
│   ├── pages/
│   │   ├── Welcome.jsx
│   │   ├── BrowseProperties.jsx
│   │   ├── Profile.jsx
│   │   ├── Register.jsx
│   │   ├── Directory.jsx
│   │   ├── Community.jsx
│   │   ├── Recommendations.jsx
│   │   ├── MyCard.jsx
│   │   ├── LandlordLogin.jsx
│   │   ├── LandlordDashboard.jsx
│   │   ├── LandlordRequests.jsx
│   │   ├── Accounting.jsx
│   │   └── AuditPage.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── pages.config.js
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_units_table.sql
│       ├── 002_seed_properties.sql
│       ├── 003_landlord_auth.sql
│       ├── 003_seed_decker_properties.sql
│       └── 004_auto_profile_creation.sql
├── docs/
│   └── PRD.md
├── .env.example
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+ (recommended current LTS)
- npm
- A Supabase project (database, auth, and storage enabled)

### Install
```bash
npm install
```

### Run locally
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Preview build
```bash
npm run preview
```

## Environment Configuration
Copy `.env.example` to `.env.local` in the project root and fill in your Supabase credentials:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

These variables are read at build time via `import.meta.env` (Vite convention). The Supabase client is initialized in `src/services/supabaseClient.js`.

## Available Scripts
Defined in `package.json`:
- `npm run dev` -- start Vite dev server
- `npm run build` -- production build
- `npm run preview` -- preview production build
- `npm run lint` -- run ESLint
- `npm run lint:fix` -- run ESLint with auto-fixes
- `npm run typecheck` -- run TypeScript check via `jsconfig.json`

## Routes and Navigation
Routes are generated from `src/pages.config.js`.

### Public routes
- `/` and `/Welcome`
- `/BrowseProperties`
- `/Profile?id=<businessId>`

### Tenant routes (require authentication)
- `/Register?propertyId=<propertyId>`
- `/Directory?propertyId=<propertyId>`
- `/Community?propertyId=<propertyId>`
- `/Recommendations?propertyId=<propertyId>`
- `/MyCard`

### Landlord routes (require landlord role)
- `/LandlordLogin`
- `/LandlordDashboard?propertyId=<propertyId>`
- `/LandlordRequests?propertyId=<propertyId>`
- `/Accounting?propertyId=<propertyId>&tab=<reports|leases|recurring|invoices|expenses>`
- `/AuditPage?propertyId=<propertyId>`

### Navigation notes
- Tenant bottom nav is implemented in `src/components/BottomNav.jsx`.
- Landlord notifications can deep-link into accounting tabs.
- Multi-property landlords use `PropertySwitcher` to change active property.

## Data Model
The application uses Supabase PostgreSQL with 15 tables, accessed through the service layer in `src/services/`:

| Table | Service Module | Description |
|-------|---------------|-------------|
| `properties` | `properties.js` | Commercial property records |
| `businesses` | `businesses.js` | Tenant business profiles |
| `posts` | `posts.js` | Community feed content |
| `recommendations` | `recommendations.js` | Tenant requests and issues |
| `notifications` | `notifications.js` | Tenant notification inbox |
| `ads` | `ads.js` | Property advertisement banners |
| `leases` | `accounting.js` | Lease agreements |
| `recurring_payments` | `accounting.js` | Scheduled payment records |
| `invoices` | `accounting.js` | Invoice records |
| `expenses` | `accounting.js` | Expense records |
| `payments` | `accounting.js` | Payment records |
| `units` | `units.js` | Property unit inventory and status |
| `profiles` | (AuthContext) | User profiles with role and property access |
| `audit_log` | (AuditLogger) | Append-only landlord action log |
| `activity_logs` | `activityLogs.js` | Page visit tracking |

Schema is managed via migration files in `supabase/migrations/`. Field-level documentation is available in `docs/PRD.md`.

## Auth and Access Model

### Overview
Authentication is handled entirely through Supabase Auth. The `AuthContext` provider (`src/lib/AuthContext.jsx`) manages session state using `supabase.auth.onAuthStateChange()` and exposes the `useAuth` hook to the application.

### Tenant authentication
- Tenants authenticate through Supabase Auth (standard session-based auth).
- Business ownership is determined by matching the authenticated user's email against the `owner_email` field on business records.
- The `AuthenticatedApp` component in `App.jsx` checks `isAuthenticated` before rendering protected routes.

### Landlord authentication
- Landlords authenticate via email magic link using `supabase.auth.signInWithOtp()`.
- On sign-in, a `profiles` record is checked (or auto-created via the `004_auto_profile_creation.sql` trigger).
- The `profiles` table stores `role` (tenant or landlord) and `property_ids` (uuid array granting access to specific properties).
- `LandlordGuard` (`src/components/guards/`) wraps landlord routes and verifies the user has `role = 'landlord'`.
- `PropertyProvider` (`src/lib/PropertyContext.jsx`) manages the active property context for multi-property landlords.
- `PropertySwitcher` (`src/components/PropertySwitcher.jsx`) allows landlords to switch between their assigned properties.
- The legacy `landlord_code` field on properties has been deprecated and nullified.

### Row-Level Security (RLS)
- All 15 tables have row-level security policies enabled.
- Financial tables (leases, invoices, expenses, payments, recurring_payments) are scoped to the landlord's assigned property IDs.
- RLS policies are defined in the migration files under `supabase/migrations/`.

## Service Layer
The service layer (`src/services/`) provides a clean abstraction over Supabase queries. Each module exports functions that handle query construction, filtering, ordering, and error handling.

Key patterns:
- **Standard services** (properties, businesses, posts, recommendations, notifications, ads, units) export individual async functions.
- **Accounting service** uses a factory pattern: `accounting.js` exports `leasesService`, `recurringPaymentsService`, `invoicesService`, `expensesService`, and `paymentsService`, each with `filter`, `create`, `update`, and `delete` methods.
- **Storage service** wraps Supabase Storage uploads to the `public-assets` bucket and returns public URLs.
- **Activity logs service** provides fire-and-forget page visit logging used by `NavigationTracker`.

All services import the shared Supabase client from `src/services/supabaseClient.js`.

## Accounting Module
Accounting page (`src/pages/Accounting.jsx`) includes:
- Reports (`FinancialReports`)
- Leases (`LeaseModal`)
- Recurring Payments (`RecurringPaymentModal`)
- Invoices (`InvoiceModal`)
- Expenses (`ExpenseModal`)

Financial reports include:
- Profit/Loss summary
- Monthly cash flow visualization
- Simplified balance sheet view
- Tenant and date-range filtering

All accounting data is property-scoped and accessed through the five services exported by `src/services/accounting.js`.

## Deployment
UNIT is a standard Vite-built SPA that can be deployed to any static hosting provider.

### Build
```bash
npm run build
```
This outputs a production bundle to `dist/`.

### Requirements
- A Supabase project with:
  - Database tables created via the migration files in `supabase/migrations/`
  - Auth enabled (email OTP for landlords)
  - Storage bucket named `public-assets` (public access)
- Environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) set at build time
- Static SPA hosting with support for client-side routing (e.g., Vercel, Netlify, Cloudflare Pages)

### Deployment steps
1. Create and configure a Supabase project.
2. Run migration files against the Supabase database.
3. Set environment variables in your hosting provider.
4. Build and deploy the `dist/` folder.

## Troubleshooting

### App redirects to login
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly.
- Ensure the Supabase project is reachable and auth is enabled.
- Check that the user session has not expired.

### Empty property-scoped pages
- Verify `propertyId` is present in the URL.
- Confirm records exist for the selected property in Supabase.

### Landlord cannot log in
- Confirm the email address has a `profiles` record with `role = 'landlord'`.
- Check that `property_ids` on the profile includes the target property.
- Verify that Supabase email OTP (magic link) is enabled in the Supabase dashboard.

### No notifications visible
- Tenant notifications require an authenticated user and matching `propertyId`.

### Accounting data appears empty
- Accounting is property-scoped; ensure the correct `propertyId` is active.
- Confirm lease, payment, and expense records exist for that property.

### Audit page shows no entries
- Audit log entries are only created by landlord actions via `AuditLogger.writeAudit()`.
- Verify the `audit_log` table exists and RLS policies allow read access.

## Known Gaps
- Stripe packages are installed in dependencies but payment integration is not implemented in source.
- 11+ unused dependencies remain (Three.js, Leaflet, html2canvas, jsPDF, moment, lodash, etc.) and should be cleaned up.
- No automated test suite.
- Dual toast notification systems coexist (sonner and react-hot-toast); should be consolidated.
- No React error boundaries for graceful failure handling.
- Financial RLS policies could be tightened further.
- Some values and assets are static or hardcoded and should be parameterized.

## Documentation
- Product requirements: `docs/PRD.md`
- Brand identity: `docs/BRAND.md`
- Database schema: `supabase/migrations/`
