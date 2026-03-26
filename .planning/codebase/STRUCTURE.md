# Codebase Structure

> Generated: 2026-03-25 | Focus: arch

## Overview

The UNIT project is a React SPA organized as a flat page-driven architecture with a service layer for Supabase data access. The codebase contains 12 page components, 21 feature components, 49 UI primitives, 11 service modules, and 4 database migration files. Total application code (excluding `node_modules`, `dist`, and UI primitives) is approximately 8,700 lines.

## Directory Layout

```
unit/
├── .planning/
│   ├── codebase/               # GSD codebase analysis documents (7 files)
│   └── research/               # GSD research artifacts
├── data/                       # Data files (Excel address book)
├── docs/                       # Project documentation (PRD)
├── src/
│   ├── components/             # Feature components (16 files, 2069 lines)
│   │   ├── accounting/         # Financial modals/reports (5 files, 1110 lines)
│   │   └── ui/                 # shadcn/ui primitives (49 files, 3999 lines)
│   ├── hooks/                  # Custom React hooks (1 file, 20 lines)
│   ├── lib/                    # Core utilities and providers (6 files)
│   ├── pages/                  # Page/route components (12 files, 4147 lines)
│   ├── services/               # Supabase data access layer (11 files, 338 lines)
│   ├── utils/                  # Shared utility functions (1 file)
│   ├── App.jsx                 # Root component with providers (83 lines)
│   ├── index.css               # Global CSS + Tailwind + CSS variables (90 lines)
│   ├── main.jsx                # React entry point (9 lines)
│   └── pages.config.js         # Auto-generated route registry (82 lines)
├── supabase/
│   └── migrations/             # SQL schema + seed data (4 files)
├── .env.local                  # Environment variables (DO NOT READ)
├── .env.example                # Environment template
├── .gitignore
├── CHANGELOG.md
├── CLAUDE.md                   # AI assistant instructions
├── components.json             # shadcn/ui component config
├── eslint.config.js            # ESLint flat config
├── index.html                  # Vite HTML entry point
├── jsconfig.json               # Path aliases + type checking config
├── package.json                # Project manifest
├── package-lock.json           # Dependency lockfile
├── postcss.config.js           # PostCSS config (Tailwind + autoprefixer)
├── README.md
├── tailwind.config.js          # Tailwind config with brand colors
└── vite.config.js              # Vite build config
```

## Directory Purposes

### `src/pages/` -- Route Components (12 files, 4147 lines)

Each file maps 1:1 to a URL route via `src/pages.config.js`. Pages are the primary orchestrators of data fetching and business logic.

| File | Lines | Purpose |
|------|-------|---------|
| `Accounting.jsx` | 693 | Landlord financial management: leases, invoices, expenses, recurring payments, reports |
| `LandlordDashboard.jsx` | 537 | Landlord overview: tenant stats, occupancy chart, lease status, payment summary |
| `Register.jsx` | 448 | Multi-step tenant registration: property selection, unit selection, business profile creation |
| `MyCard.jsx` | 437 | Business card view/edit for current user + QR code generation |
| `Directory.jsx` | 354 | Business directory with search, category filter, grid/map view toggle |
| `BrowseProperties.jsx` | 342 | Public property explorer with per-property tabs (businesses, posts, requests) |
| `Community.jsx` | 313 | Community feed: posts, announcements, events, offers with type filters |
| `Recommendations.jsx` | 280 | Enhancement requests, issues, work orders with status tracking |
| `Profile.jsx` | 231 | Public business profile view (read-only) |
| `LandlordRequests.jsx` | 226 | Landlord view of tenant requests with status management |
| `Welcome.jsx` | 162 | Landing page: property search, feature highlights, hero section |
| `LandlordLogin.jsx` | 124 | Landlord code-based authentication form |

### `src/components/` -- Feature Components (16 files, 2069 lines)

Domain-specific reusable components imported by pages. All use default exports.

| File | Lines | Purpose |
|------|-------|---------|
| `LandlordNotificationBell.jsx` | 225 | Notification bell + dropdown for landlord dashboard |
| `FloorMapView.jsx` | 219 | Interactive floor map with business pins (drag-and-drop for landlords) |
| `NotificationBell.jsx` | 178 | Notification bell + dropdown for tenant pages |
| `QRCodeCard.jsx` | 152 | Business card modal with QR code for sharing |
| `AdPopup.jsx` | 150 | Popup advertisement overlay for property pages |
| `BusinessCard.jsx` | 149 | Business card display in directory grid |
| `CreatePostModal.jsx` | 147 | Modal form for creating community posts |
| `BusinessQRCode.jsx` | 132 | QR code generator for business profiles |
| `CreateRecommendationModal.jsx` | 129 | Modal form for submitting requests/issues |
| `AdBanner.jsx` | 120 | Banner advertisement for property pages |
| `RecommendationCard.jsx` | 116 | Card displaying a request/recommendation with status badge |
| `PostCard.jsx` | 114 | Card displaying a community post with type badge |
| `PropertySearch.jsx` | 92 | Autocomplete search for properties on landing page |
| `BottomNav.jsx` | 78 | Mobile bottom navigation bar (5 tabs) |
| `UnitLogo.jsx` | 37 | SVG logo component with configurable size |
| `UserNotRegisteredError.jsx` | 31 | Error state component for unregistered users |

### `src/components/accounting/` -- Financial Components (5 files, 1110 lines)

Landlord-facing accounting modals and reports. Used exclusively by `src/pages/Accounting.jsx`.

| File | Lines | Purpose |
|------|-------|---------|
| `FinancialReports.jsx` | 446 | Financial dashboard with revenue/expense charts, summaries, projections |
| `LeaseModal.jsx` | 176 | Create/edit lease agreements |
| `RecurringPaymentModal.jsx` | 167 | Create/edit recurring payment schedules |
| `InvoiceModal.jsx` | 166 | Create/edit billing invoices |
| `ExpenseModal.jsx` | 155 | Create/edit property expenses |

### `src/components/ui/` -- UI Primitives (49 files, 3999 lines)

shadcn/ui components built on Radix UI. Generated/scaffolded -- do not manually edit. Most used components by import frequency:

- `button.jsx` (48 lines) -- used in every page
- `card.jsx` (50 lines) -- used in most pages
- `badge.jsx` (34 lines) -- status/category labels
- `dialog.jsx` (96 lines) -- modal containers
- `input.jsx` (19 lines) -- form fields
- `select.jsx` (121 lines) -- dropdown selects
- `tabs.jsx` (41 lines) -- tabbed views
- `label.jsx` (16 lines) -- form labels
- `textarea.jsx` (18 lines) -- multiline input
- `toaster.jsx` (32 lines) -- toast notification container
- `toast.jsx` (103 lines) -- toast primitives
- `table.jsx` (86 lines) -- data tables

### `src/services/` -- Data Access Layer (11 files, 338 lines)

Thin wrappers around the Supabase JS client. Each file exports a named service object.

| File | Lines | Export(s) | Tables |
|------|-------|-----------|--------|
| `supabaseClient.js` | 10 | `supabase` | -- (client singleton) |
| `accounting.js` | 54 | `leasesService`, `recurringPaymentsService`, `invoicesService`, `expensesService`, `paymentsService` | leases, recurring_payments, invoices, expenses, payments |
| `notifications.js` | 48 | `notificationsService` | notifications |
| `units.js` | 45 | `unitsService` | units |
| `businesses.js` | 44 | `businessesService` | businesses |
| `recommendations.js` | 35 | `recommendationsService` | recommendations |
| `properties.js` | 31 | `propertiesService` | properties |
| `posts.js` | 24 | `postsService` | posts |
| `storage.js` | 20 | `storageService` | -- (Supabase Storage) |
| `activityLogs.js` | 14 | `activityLogsService` | activity_logs |
| `ads.js` | 13 | `adsService` | ads |

### `src/lib/` -- Core Utilities and Providers (6 files)

| File | Purpose |
|------|---------|
| `AuthContext.jsx` | React Context provider for Supabase auth state + `useAuth` hook |
| `colors.js` | Brand colors, status colors, category colors, chart colors for non-Tailwind contexts |
| `NavigationTracker.jsx` | Invisible component that logs page visits via `activityLogsService` |
| `PageNotFound.jsx` | 404 fallback page with admin note |
| `query-client.js` | React Query `QueryClient` configuration (refetchOnWindowFocus: false, retry: 1) |
| `utils.js` | `cn()` classname merger + `isIframe` detection |

### `src/hooks/` -- Custom Hooks (1 file)

| File | Purpose |
|------|---------|
| `use-mobile.jsx` | `useIsMobile()` hook -- returns boolean for viewport < 768px |

### `src/utils/` -- Utility Functions (1 file)

| File | Purpose |
|------|---------|
| `index.ts` | `createPageUrl(pageName)` -- converts page name to URL path (TypeScript) |

### `supabase/migrations/` -- Database Schema (4 files)

| File | Purpose |
|------|---------|
| `001_initial_schema.sql` | 12 core tables, all indexes, all RLS policies (345 lines) |
| `002_units_table.sql` | Units table, FK additions, auto-status trigger (122 lines) |
| `002_seed_properties.sql` | 7 Decker Capital property records |
| `003_seed_decker_properties.sql` | Extended seed data with unit addresses |

## Key File Locations

### Entry Points
- `index.html` -- Vite HTML shell, mounts React at `#root`
- `src/main.jsx` -- React DOM render, imports `App.jsx` and `index.css`
- `src/App.jsx` -- Provider tree: AuthProvider > QueryClientProvider > Router > NavigationTracker + AuthenticatedApp + Toaster

### Configuration
- `vite.config.js` -- Vite config with `@` path alias and React plugin
- `jsconfig.json` -- `@/*` -> `./src/*` alias, `checkJs: true`, excludes `src/components/ui` from type checking
- `tailwind.config.js` -- Brand color palette, shadcn/ui CSS variable tokens, accordion animations
- `eslint.config.js` -- ESLint flat config with unused-imports and react-hooks plugins
- `postcss.config.js` -- Tailwind CSS + autoprefixer
- `components.json` -- shadcn/ui configuration for component generation
- `src/index.css` -- CSS custom properties for light/dark themes, Tailwind directives

### Core Logic
- `src/lib/AuthContext.jsx` -- Supabase auth session management, `useAuth()` hook
- `src/lib/query-client.js` -- React Query global configuration
- `src/services/supabaseClient.js` -- Supabase JS client initialization from env vars
- `src/lib/NavigationTracker.jsx` -- Page visit logging
- `src/lib/colors.js` -- Centralized color definitions for brand, status, priority, financial, category

### Routing
- `src/pages.config.js` -- Auto-generated route registry (DO NOT manually edit except `mainPage`)
- `src/utils/index.ts` -- `createPageUrl()` helper used by all page navigation

## Import Graph Patterns

### Page -> Service Dependencies

```
Welcome.jsx         -> propertiesService
Register.jsx        -> propertiesService, businessesService, unitsService, storageService, supabase (auth)
Community.jsx       -> propertiesService, businessesService, postsService, notificationsService, supabase (auth)
Directory.jsx       -> propertiesService, businessesService
Recommendations.jsx -> propertiesService, businessesService, recommendationsService, notificationsService, supabase (auth)
MyCard.jsx          -> propertiesService, businessesService, supabase (auth)
Profile.jsx         -> propertiesService, businessesService
BrowseProperties.jsx-> propertiesService, businessesService, postsService, recommendationsService
LandlordLogin.jsx   -> propertiesService
LandlordDashboard.jsx -> propertiesService, businessesService, recommendationsService, leasesService, paymentsService, unitsService
LandlordRequests.jsx-> propertiesService, businessesService, recommendationsService
Accounting.jsx      -> propertiesService, businessesService, leasesService, recurringPaymentsService, invoicesService, expensesService, paymentsService
```

### Common Import Patterns

Every page imports:
- `useQuery` (and often `useMutation`, `useQueryClient`) from `@tanstack/react-query`
- `createPageUrl` from `@/utils`
- `useNavigate` from `react-router-dom`
- At least one UI primitive from `@/components/ui/`
- `motion` from `framer-motion` (except LandlordRequests)
- Icons from `lucide-react`

### Service -> Supabase Dependencies

All services import from `./supabaseClient`:
```
src/services/supabaseClient.js  (root dependency -- creates Supabase client)
  |-- src/services/properties.js
  |-- src/services/businesses.js
  |-- src/services/posts.js
  |-- src/services/recommendations.js
  |-- src/services/notifications.js
  |-- src/services/accounting.js (exports 5 services)
  |-- src/services/ads.js
  |-- src/services/storage.js
  |-- src/services/activityLogs.js
  +-- src/services/units.js
```

### Direct Supabase Client Usage

Some files import `supabase` directly from `@/services/supabaseClient` instead of going through a service:
- `src/lib/AuthContext.jsx` -- for auth methods
- `src/lib/PageNotFound.jsx` -- for auth check
- `src/pages/Community.jsx` -- for `auth.getSession()`/`auth.getUser()`
- `src/pages/Recommendations.jsx` -- for `auth.getSession()`/`auth.getUser()`
- `src/pages/MyCard.jsx` -- for `auth.getSession()`/`auth.getUser()`
- `src/pages/Register.jsx` -- for `auth.getSession()`/`auth.getUser()`

## Where to Add New Code

### New Page/Route
1. Create `src/pages/{PageName}.jsx` (PascalCase)
2. Export a default functional component
3. The file is auto-registered in `src/pages.config.js` -- no manual edits needed
4. Access at `/{PageName}` URL
5. Use `const urlParams = new URLSearchParams(window.location.search)` for URL params
6. Use `useQuery` for data fetching with `queryKey: ['{entity}', propertyId]`
7. Include `<BottomNav propertyId={propertyId} />` for mobile nav if property-scoped

### New Service
1. Create `src/services/{entity}.js`
2. Import `supabase` from `./supabaseClient`
3. Export a named object (e.g., `export const {entity}Service = { ... }`)
4. Implement `filter()`, `getById()`, `create()`, `update()` methods following existing pattern
5. For multiple related tables, use the factory pattern from `src/services/accounting.js`

### New Feature Component
1. Create `src/components/{ComponentName}.jsx` (PascalCase)
2. Accept props for data, callbacks (onClose, onSubmit), and loading states
3. Import UI primitives from `@/components/ui/`
4. Export as default
5. Import in page component

### New Modal Dialog
1. Create `src/components/{FeatureName}Modal.jsx` or `src/components/{domain}/{ModalName}.jsx`
2. Use `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` from `@/components/ui/dialog`
3. Accept `isOpen`, `onClose`, `onSubmit`, `isLoading` props
4. Manage form state with `useState`
5. Call `onSubmit(formData)` on form submission

### New Accounting Feature
1. Create component in `src/components/accounting/`
2. If new table needed, add migration to `supabase/migrations/` and service to `src/services/`
3. Wire into `src/pages/Accounting.jsx` tab system

### New UI Primitive
1. Use shadcn/ui CLI or create manually in `src/components/ui/{component-name}.jsx` (kebab-case)
2. Base on Radix UI component
3. Use `cn()` from `@/lib/utils` for class merging
4. Use CVA for variants (see `src/components/ui/button.jsx` pattern)

### New Database Table
1. Create new migration file in `supabase/migrations/` with sequential number prefix
2. Include table creation, indexes, and RLS policies
3. Create corresponding service file in `src/services/`
4. Enable RLS: `alter table {name} enable row level security;`
5. Add at minimum a SELECT policy for authenticated users

### New Custom Hook
1. Create `src/hooks/use-{name}.jsx` (kebab-case with `use-` prefix)
2. Follow React hooks naming convention
3. Return state/methods as an object

### New Utility Function
1. Add to `src/utils/index.ts` for general-purpose utilities
2. Or create `src/lib/{name}.js` for domain-specific constants/helpers
3. Use named exports

## Special Directories

### `.planning/codebase/`
- Purpose: GSD codebase analysis documents
- Generated: Yes (by mapper agent)
- Committed: Yes
- Files: STACK.md, INTEGRATIONS.md, ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

### `src/components/ui/`
- Purpose: shadcn/ui component primitives
- Generated: Yes (scaffolded via shadcn/ui CLI)
- Committed: Yes
- Note: Excluded from `jsconfig.json` type checking via `"exclude"` array. Do not manually edit.

### `supabase/migrations/`
- Purpose: Database schema definition and seed data
- Generated: No (hand-written SQL)
- Committed: Yes
- Applied: Manually via Supabase SQL Editor (no CLI migration runner configured)

### `node_modules/`
- Purpose: NPM dependencies
- Generated: Yes (`npm install`)
- Committed: No

### `dist/`
- Purpose: Vite production build output
- Generated: Yes (`npm run build`)
- Committed: No

## Path Aliases

Configured in both `jsconfig.json` and `vite.config.js`:

```javascript
// @/* maps to ./src/*
import { Button } from '@/components/ui/button';
import { propertiesService } from '@/services/properties';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
```

All internal imports use the `@/` prefix. No relative imports (`../`) are used except for:
- `src/services/*.js` files importing from `'./supabaseClient'` (relative within services directory)
- `src/pages/LandlordDashboard.jsx` importing `'../components/LandlordNotificationBell'` (inconsistent -- should use `@/`)

## File Count Summary

| Directory | Files | Lines |
|-----------|-------|-------|
| `src/pages/` | 12 | 4,147 |
| `src/components/` (feature) | 16 | 2,069 |
| `src/components/accounting/` | 5 | 1,110 |
| `src/components/ui/` | 49 | 3,999 |
| `src/services/` | 11 | 338 |
| `src/lib/` | 6 | ~350 |
| `src/hooks/` | 1 | 20 |
| `src/utils/` | 1 | 3 |
| Root src files | 4 | ~264 |
| `supabase/migrations/` | 4 | ~500+ |
| **Total application code** | **109** | **~12,800** |
| **Excluding UI primitives** | **60** | **~8,800** |

## Key Findings

- **No test files exist anywhere in the codebase.** There is no `__tests__/`, `*.test.*`, or `*.spec.*` file.
- **No Layout component.** Each page independently renders its own header, navigation, and footer. This causes significant duplication of header/nav markup across all 12 pages.
- **Single relative import anomaly:** `src/pages/LandlordDashboard.jsx` uses `'../components/LandlordNotificationBell'` instead of the `@/` alias convention.
- **Old Base44 artifacts:** `src/api/base44Client.js` is deleted (shown in git status as `D`) and `src/lib/app-params.js` is deleted. These were part of the pre-migration Base44 integration.
- **Seed data is committed:** `supabase/migrations/002_seed_properties.sql` and `003_seed_decker_properties.sql` contain real property data in the repo.
- **Two files for the same migration number:** Both `002_units_table.sql` and `002_seed_properties.sql` use the `002` prefix, which could cause confusion with migration ordering.

---

*Structure analysis: 2026-03-25*
