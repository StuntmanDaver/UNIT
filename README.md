# UNIT

UNIT is a property-community application for business tenants and landlords. It is a React SPA backed by Base44 entities/auth and includes:
- Tenant onboarding and business profile creation.
- Property directory and community engagement.
- Recommendation/request workflows.
- Landlord dashboard and request operations.
- Accounting workflows (leases, recurring payments, invoices, expenses, reports).

For a full reverse-engineered product specification, see `docs/PRD.md`.

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
- [Accounting Module](#accounting-module)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Known Gaps](#known-gaps)

## Product Overview
UNIT connects businesses within the same property and provides landlord-facing operational tooling.

### Tenant experience
- Find/select property.
- Register business profile.
- Discover neighboring businesses in directory.
- Share community content (announcements/events/offers).
- Submit property recommendations/issues/work orders.
- Share business profile via QR/link.

### Landlord experience
- Login with property access code.
- Monitor occupancy, requests, payments, and lease risk.
- Update recommendation/request statuses.
- Manage lease, recurring charge, invoice, and expense records.
- View financial reports and trends.

## Core Features
### 1) Property Discovery
- Property search and browse flows.
- Property-scoped experience using `propertyId`.

### 2) Business Registration and Profile
- Two-step registration with contact info and category.
- Optional logo upload via Base44 file upload integration.
- MyCard profile editing and QR sharing.

### 3) Directory and Floor View
- Search/filter businesses.
- Featured business treatment.
- Grid and map-like coordinate layout.

### 4) Community
- Post types: `announcement`, `event`, `offer`.
- Type-specific fields for events/offers.
- Property-level feed.

### 5) Recommendations (Requests)
- Types: `enhancement`, `issue`, `work_order`.
- Status lifecycle supported: `submitted`, `in_progress`, `resolved`, `closed`.
- Priority support: `low`, `medium`, `high`.

### 6) Notifications
- Tenant inbox from persisted `Notification` entities.
- Landlord synthesized alert panel from requests/payments/leases.

### 7) Accounting
- Reports tab with P&L, cash flow, and simplified balance sheet.
- Leases create/update.
- Recurring payments create.
- Invoice generation.
- Expense recording.

## Tech Stack
- Runtime: React 18
- Routing: React Router v6
- Data orchestration: TanStack Query v5
- Backend/BaaS: Base44 SDK
- Build tool: Vite 6
- Styling: Tailwind CSS + shadcn/ui + Radix UI
- Animations: Framer Motion
- Charts: Recharts
- Utilities: date-fns, moment, lodash

## Architecture
### Application shell
- Entry: `src/main.jsx`
- Root app: `src/App.jsx`
- Dynamic route registration: `src/pages.config.js`

### Core infrastructure modules
- Base44 client: `src/api/base44Client.js`
- Auth context and app public-settings bootstrap: `src/lib/AuthContext.jsx`
- URL/env parameter resolver: `src/lib/app-params.js`
- Query client: `src/lib/query-client.js`
- Navigation activity logging: `src/lib/NavigationTracker.jsx`

### UI architecture
- `src/pages/` for route-level screens.
- `src/components/` for feature components.
- `src/components/ui/` for shadcn primitives.

## Repository Structure
```text
.
├── src/
│   ├── api/
│   │   └── base44Client.js
│   ├── components/
│   │   ├── accounting/
│   │   ├── ui/
│   │   └── ...
│   ├── lib/
│   ├── pages/
│   ├── App.jsx
│   ├── main.jsx
│   └── pages.config.js
├── docs/
│   └── PRD.md
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## Getting Started
### Prerequisites
- Node.js 18+ (recommended current LTS)
- npm

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
Create `.env.local` in project root:

```bash
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_base44_app_url
# Optional
VITE_BASE44_FUNCTIONS_VERSION=your_functions_version
```

The app also accepts URL-driven runtime params (persisted to local storage by `src/lib/app-params.js`):
- `app_id`
- `access_token` (removed from URL after read)
- `app_base_url`
- `functions_version`
- `from_url`
- `clear_access_token=true` (clears token storage)

## Available Scripts
Defined in `package.json`:
- `npm run dev` -> start Vite dev server
- `npm run build` -> production build
- `npm run preview` -> preview production build
- `npm run lint` -> run ESLint
- `npm run lint:fix` -> run ESLint with auto-fixes
- `npm run typecheck` -> run TypeScript check via `jsconfig.json`

## Routes and Navigation
Routes are generated from `src/pages.config.js`.

### Public/shared routes
- `/` and `/Welcome`
- `/BrowseProperties`
- `/Profile?id=<businessId>`

### Tenant routes
- `/Register?propertyId=<propertyId>`
- `/Directory?propertyId=<propertyId>`
- `/Community?propertyId=<propertyId>`
- `/Recommendations?propertyId=<propertyId>`
- `/MyCard`

### Landlord routes
- `/LandlordLogin`
- `/LandlordDashboard?propertyId=<propertyId>`
- `/LandlordRequests?propertyId=<propertyId>`
- `/Accounting?propertyId=<propertyId>&tab=<reports|leases|recurring|invoices|expenses>`

### Navigation notes
- Tenant bottom nav is implemented in `src/components/BottomNav.jsx`.
- Landlord notifications can deep-link into accounting tabs.

## Data Model
Entities used through `base44.entities.*`:
- `Property`
- `Business`
- `Post`
- `Recommendation`
- `Notification`
- `Ad`
- `Lease`
- `RecurringPayment`
- `Invoice`
- `Expense`
- `Payment`

Field usage is reverse-engineered in detail in `docs/PRD.md`.

## Auth and Access Model
### App-level auth
- Auth bootstrap occurs in `AuthContext`:
  - fetch app public settings
  - resolve auth-required / user-not-registered states
  - fetch current user if token exists
- `App.jsx` redirects to login when auth is required.

### Tenant identity
- Current user from Base44 auth.
- Business ownership inferred by matching `owner_email`.

### Landlord identity
- Property code login (`landlord_code`) in `LandlordLogin`.
- Session is stored as `sessionStorage.landlord_property_id`.
- Dashboard verifies session/property match.

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
- Tenant/date-range filtering

## Deployment
This project is designed to work with Base44 GitHub integration:
1. Push changes to the connected repository.
2. Open Base44 Builder.
3. Publish from Base44.

Reference docs:
- [Base44 GitHub Integration](https://docs.base44.com/Integrations/Using-GitHub)
- [Base44 Support](https://app.base44.com/support)

## Troubleshooting
### App redirects to login
- Check `VITE_BASE44_APP_ID` and `VITE_BASE44_APP_BASE_URL`.
- Ensure token/session is valid.
- Check app public settings in Base44.

### `Access Restricted` shown
- User may not be registered for app access (Base44 public-settings behavior).

### Empty property-scoped pages
- Verify `propertyId` is present in URL.
- Confirm entities exist for selected property.

### No notifications visible
- Tenant notifications require authenticated user and matching `propertyId`.

### Accounting data appears empty
- Accounting is property-scoped; ensure correct `propertyId`.
- Confirm lease/payment/expense entities exist.

## Known Gaps
- Landlord auth is lightweight (code + client session) and should be hardened for production.
- Stripe packages exist in dependencies but payment integration is not implemented in source.
- No automated test suite is currently included.
- Accounting and landlord routing protections are not fully centralized.
- Some values/assets are static/hardcoded and should be parameterized.

## Reverse-Engineered Documentation
- Product requirements: `docs/PRD.md`
