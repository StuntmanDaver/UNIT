# Codebase Structure

**Analysis Date:** 2026-03-27

## Directory Layout

```
unit/
├── .claude/                        # Claude agent worktrees (gitignored)
├── .planning/
│   ├── codebase/                   # GSD codebase analysis documents (7 files)
│   ├── phases/                     # GSD phase planning artifacts
│   │   ├── 01-security-access-control/
│   │   └── 02-financial-operations-workflows/
│   └── research/                   # GSD research artifacts
├── data/                           # Data files (Excel address book)
├── docs/                           # Project documentation
│   ├── PRD.md                      # Product requirements document
│   └── superpowers/specs/          # Feature specifications
├── scripts/                        # Utility scripts
│   └── seed-landlord.sql           # Landlord seed data script
├── specs/                          # Design specification documents
├── src/
│   ├── components/                 # Feature components (21 files)
│   │   ├── accounting/             # Financial modals/reports (5 files)
│   │   ├── guards/                 # Route protection components (1 file)
│   │   └── ui/                     # shadcn/ui primitives (49 files)
│   ├── hooks/                      # Custom React hooks (1 file)
│   ├── lib/                        # Core utilities, providers, cross-cutting (8 files)
│   ├── pages/                      # Page/route components (13 files)
│   ├── services/                   # Supabase data access layer (11 files)
│   ├── utils/                      # Shared utility functions (1 file)
│   ├── App.jsx                     # Root component with providers and routing
│   ├── index.css                   # Global CSS + Tailwind directives + CSS variables
│   ├── main.jsx                    # React entry point
│   └── pages.config.js             # Auto-generated route registry (DO NOT EDIT)
├── supabase/
│   └── migrations/                 # SQL schema + seed data (6 files)
├── tests/                          # E2E test files (Playwright)
│   └── landlord-login.spec.js      # Landlord login E2E test
├── .env.example                    # Environment variable template
├── .env.local                      # Environment variables (DO NOT READ)
├── .gitignore
├── CHANGELOG.md                    # Project changelog
├── CLAUDE.md                       # AI assistant instructions
├── components.json                 # shadcn/ui component configuration
├── eslint.config.js                # ESLint flat config
├── index.html                      # Vite HTML entry point
├── jsconfig.json                   # Path aliases + type checking config
├── package.json                    # Project manifest
├── package-lock.json               # Dependency lockfile
├── playwright.config.js            # Playwright test configuration
├── postcss.config.js               # PostCSS config (Tailwind + autoprefixer)
├── README.md                       # Project readme
├── tailwind.config.js              # Tailwind config with brand colors
└── vite.config.js                  # Vite build config with @/ alias
```

## Directory Purposes

### `src/pages/` -- Route Components (13 files)

Each file maps 1:1 to a URL route via `src/pages.config.js`. Pages are the primary orchestrators: they fetch data, manage local UI state, and compose feature components.

| File | Purpose |
|---|---|
| `Accounting.jsx` | Landlord financial management: leases, invoices, expenses, recurring payments, reports. Tab-based UI. |
| `AuditPage.jsx` | Audit log viewer with entity type, action, and email filters |
| `BrowseProperties.jsx` | Public property explorer with per-property tabs |
| `Community.jsx` | Community feed: posts, announcements, events, offers with type filters |
| `Directory.jsx` | Business directory with search, category filter, grid/map view toggle |
| `LandlordDashboard.jsx` | Landlord overview: occupancy pie chart, revenue stats, request summary, lease status |
| `LandlordLogin.jsx` | OTP magic-link landlord authentication form |
| `LandlordRequests.jsx` | Landlord view of tenant requests with status management and inline audit trails |
| `MyCard.jsx` | Business card view/edit for current user + QR code generation |
| `Profile.jsx` | Public business profile view (read-only) |
| `Recommendations.jsx` | Enhancement requests, issues, work orders with status tracking |
| `Register.jsx` | Multi-step tenant registration: property selection, unit selection, business profile creation |
| `Welcome.jsx` | Landing page: property search, feature highlights, hero section |

### `src/components/` -- Feature Components (21 files)

Domain-specific reusable components imported by pages. All use default exports with PascalCase naming.

| File | Purpose |
|---|---|
| `AdBanner.jsx` | Banner advertisement for property pages |
| `AdPopup.jsx` | Popup advertisement overlay |
| `AuditLogEntry.jsx` | Single audit log entry display |
| `AuditLogTimeline.jsx` | Audit log timeline list component |
| `BottomNav.jsx` | Tenant mobile bottom navigation bar (5 tabs: Home, Directory, Community, Requests, My Profile) |
| `BusinessCard.jsx` | Business card display in directory grid |
| `BusinessQRCode.jsx` | QR code generator for business profiles |
| `CreatePostModal.jsx` | Modal form for creating community posts |
| `CreateRecommendationModal.jsx` | Modal form for submitting requests/issues |
| `FloorMapView.jsx` | Interactive floor map with business pins |
| `LandlordNotificationBell.jsx` | Notification bell + dropdown for landlord pages |
| `NotificationBell.jsx` | Notification bell + dropdown for tenant pages |
| `PostCard.jsx` | Card displaying a community post with type badge |
| `PropertySearch.jsx` | Autocomplete search for properties on landing page |
| `PropertySwitcher.jsx` | Landlord multi-property dropdown switcher (hidden when only 1 property) |
| `QRCodeCard.jsx` | QR code display card modal |
| `RecommendationCard.jsx` | Card displaying a request/recommendation with status badge |
| `UnitLogo.jsx` | SVG logo component with configurable size |
| `UserNotRegisteredError.jsx` | Error state component for unregistered users |

### `src/components/accounting/` -- Financial Components (5 files)

Landlord-facing accounting modals and reports. Used exclusively by `src/pages/Accounting.jsx`.

| File | Purpose |
|---|---|
| `ExpenseModal.jsx` | Create/edit property expenses |
| `FinancialReports.jsx` | Financial dashboard with revenue/expense charts (Recharts), summaries, projections |
| `InvoiceModal.jsx` | Create/edit billing invoices |
| `LeaseModal.jsx` | Create/edit lease agreements |
| `RecurringPaymentModal.jsx` | Create/edit recurring payment schedules |

### `src/components/guards/` -- Route Protection (1 file)

| File | Purpose |
|---|---|
| `LandlordGuard.jsx` | React Router layout route: checks `isLandlord` from AuthContext, redirects unauthorized users |

### `src/components/ui/` -- UI Primitives (49 files)

shadcn/ui components built on Radix UI. Generated/scaffolded via shadcn/ui CLI (New York style). **Do not manually edit.** Excluded from `jsconfig.json` type checking.

Most-imported components:
- `button.jsx` -- Used in every page and most modals
- `card.jsx` -- Container for most content sections
- `badge.jsx` -- Status/category labels
- `dialog.jsx` -- Modal containers
- `input.jsx` -- Form text fields
- `select.jsx` -- Dropdown selects
- `tabs.jsx` -- Tabbed views (Accounting page)
- `table.jsx` -- Data tables
- `alert-dialog.jsx` -- Confirmation dialogs (delete operations)
- `dropdown-menu.jsx` -- Context menus and dropdowns
- `toast.jsx` / `toaster.jsx` -- Toast notifications
- `sidebar.jsx` -- Sidebar navigation component

### `src/services/` -- Data Access Layer (11 files)

Thin wrappers around the Supabase JS client. Each file exports a named service object.

| File | Export(s) | Supabase Tables |
|---|---|---|
| `supabaseClient.js` | `supabase` | -- (client singleton) |
| `accounting.js` | `leasesService`, `recurringPaymentsService`, `invoicesService`, `expensesService`, `paymentsService` | leases, recurring_payments, invoices, expenses, payments |
| `businesses.js` | `businessesService` | businesses |
| `notifications.js` | `notificationsService` | notifications |
| `posts.js` | `postsService` | posts |
| `properties.js` | `propertiesService` | properties |
| `recommendations.js` | `recommendationsService` | recommendations |
| `units.js` | `unitsService` | units |
| `storage.js` | `storageService` | -- (Supabase Storage bucket `public-assets`) |
| `activityLogs.js` | `activityLogsService` | activity_logs |
| `ads.js` | `adsService` | ads |

### `src/lib/` -- Core Utilities and Providers (8 files)

| File | Purpose |
|---|---|
| `AuthContext.jsx` | React Context provider for Supabase auth state + `useAuth()` hook |
| `PropertyContext.jsx` | React Context provider for active property (landlord) + `useProperty()` hook |
| `query-client.js` | React Query `QueryClient` singleton (refetchOnWindowFocus: false, retry: 1) |
| `AuditLogger.js` | `writeAudit()` function for append-only audit log entries |
| `NavigationTracker.jsx` | Renderless component that logs page visits for authenticated users |
| `colors.js` | Centralized color definitions: BRAND, STATUS_COLORS, PRIORITY_COLORS, FINANCIAL_COLORS, CHART_COLORS, CATEGORY_COLORS, CATEGORY_GRADIENTS |
| `PageNotFound.jsx` | 404 fallback page component |
| `utils.js` | `cn()` classname merger (clsx + tailwind-merge) + `isIframe` detection |

### `src/hooks/` -- Custom Hooks (1 file)

| File | Purpose |
|---|---|
| `use-mobile.jsx` | `useIsMobile()` -- returns boolean for viewport < 768px breakpoint |

### `src/utils/` -- Utility Functions (1 file)

| File | Purpose |
|---|---|
| `index.ts` | `createPageUrl(pageName)` -- converts page name to URL path (e.g., `'LandlordDashboard'` -> `'/LandlordDashboard'`) |

### `supabase/migrations/` -- Database Schema (6 files)

| File | Purpose |
|---|---|
| `001_initial_schema.sql` | Core tables (12), all indexes, initial RLS policies |
| `002_units_table.sql` | Units table, FK additions to businesses/leases, auto-status trigger |
| `002_seed_properties.sql` | Seed data for properties |
| `003_landlord_auth.sql` | Profiles table, `is_landlord()` + `landlord_property_ids()` functions, property-scoped financial RLS, audit_log table, landlord_code neutralization |
| `003_seed_decker_properties.sql` | Seed data for Decker Capital properties with unit addresses |
| `004_auto_profile_creation.sql` | Trigger for auto-creating tenant profile on auth.users insert, backfill |

### `tests/` -- E2E Tests (1 file)

| File | Purpose |
|---|---|
| `landlord-login.spec.js` | Playwright E2E test for landlord OTP login flow |

### `scripts/` -- Utility Scripts (1 file)

| File | Purpose |
|---|---|
| `seed-landlord.sql` | SQL script to seed landlord profile data |

## Key File Locations

### Entry Points
- `index.html` -- Vite HTML shell, mounts React at `#root`, loads `src/main.jsx`
- `src/main.jsx` -- React DOM render, imports `App.jsx` and `index.css`
- `src/App.jsx` -- Provider tree: AuthProvider > QueryClientProvider > Router > NavigationTracker + AuthenticatedApp + Toaster

### Configuration
- `vite.config.js` -- Vite config with `@` path alias and React plugin
- `jsconfig.json` -- `@/*` -> `./src/*` alias, `checkJs: true`, excludes `src/components/ui` and `src/lib` from type checking
- `tailwind.config.js` -- Brand color palette (`brand-*`), shadcn/ui CSS variable tokens, accordion animations
- `eslint.config.js` -- ESLint flat config with unused-imports and react-hooks plugins
- `postcss.config.js` -- Tailwind CSS + autoprefixer
- `components.json` -- shadcn/ui configuration (New York style, JSX, Lucide icons)
- `src/index.css` -- CSS custom properties for light/dark themes, Tailwind directives

### Core Logic
- `src/lib/AuthContext.jsx` -- Supabase auth session management, `useAuth()` hook
- `src/lib/PropertyContext.jsx` -- Active property management for landlord pages, `useProperty()` hook
- `src/lib/query-client.js` -- React Query global configuration
- `src/services/supabaseClient.js` -- Supabase JS client initialization from env vars
- `src/lib/AuditLogger.js` -- Audit log write function
- `src/lib/NavigationTracker.jsx` -- Page visit logging
- `src/lib/colors.js` -- Centralized color definitions

### Routing
- `src/pages.config.js` -- Auto-generated route registry (DO NOT manually edit except `mainPage`)
- `src/utils/index.ts` -- `createPageUrl()` helper used by all page navigation
- `src/components/guards/LandlordGuard.jsx` -- Route protection for landlord pages

### Testing
- `playwright.config.js` -- Playwright configuration
- `tests/landlord-login.spec.js` -- Landlord login E2E test

## Naming Conventions

### Files

| Pattern | Directory | Example |
|---|---|---|
| PascalCase.jsx | `src/pages/` | `LandlordDashboard.jsx`, `Community.jsx` |
| PascalCase.jsx | `src/components/` | `PostCard.jsx`, `CreatePostModal.jsx` |
| PascalCase.jsx | `src/components/guards/` | `LandlordGuard.jsx` |
| PascalCase.jsx | `src/components/accounting/` | `InvoiceModal.jsx`, `FinancialReports.jsx` |
| kebab-case.jsx | `src/components/ui/` | `alert-dialog.jsx`, `radio-group.jsx` |
| kebab-case.jsx | `src/hooks/` | `use-mobile.jsx` |
| camelCase.js | `src/services/` | `supabaseClient.js`, `activityLogs.js` |
| camelCase.js | `src/lib/` | `query-client.js`, `colors.js` |
| PascalCase.jsx | `src/lib/` (components) | `AuthContext.jsx`, `NavigationTracker.jsx`, `PageNotFound.jsx` |
| PascalCase.js | `src/lib/` (modules) | `AuditLogger.js` |
| PascalCase.jsx | `src/lib/` (contexts) | `PropertyContext.jsx` |
| NNN_description.sql | `supabase/migrations/` | `001_initial_schema.sql`, `003_landlord_auth.sql` |

### Directories
- PascalCase is NOT used for directories
- All directories use lowercase or kebab-case: `components/`, `accounting/`, `guards/`, `ui/`

## Import Patterns

### Path Aliases

Configured in both `jsconfig.json` and `vite.config.js`:
```javascript
// @/* maps to ./src/*
import { Button } from '@/components/ui/button';
import { propertiesService } from '@/services/properties';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
```

All internal imports use the `@/` prefix. Exceptions:
- `src/services/*.js` files import from `'./supabaseClient'` (relative within services directory)
- `src/pages/LandlordDashboard.jsx` has one relative import: `'../components/LandlordNotificationBell'` (inconsistent -- should use `@/`)

### Barrel Files
- `src/utils/index.ts` acts as a barrel file (import from `@/utils`)
- `src/components/ui/*` has NO barrel file -- import individual components directly
- No other barrel files in the codebase

### Import Order (observed convention)
1. React and React hooks
2. Third-party libraries (`@tanstack/react-query`, `react-router-dom`, `framer-motion`)
3. Services (`@/services/*`)
4. Contexts and hooks (`@/lib/*`, `@/hooks/*`)
5. Feature components (`@/components/*`)
6. UI components (`@/components/ui/*`)
7. Icons (`lucide-react`)

### Page -> Service Dependencies

```
Welcome.jsx          -> propertiesService
Register.jsx         -> propertiesService, businessesService, unitsService, storageService, supabase (auth)
Community.jsx        -> propertiesService, businessesService, postsService, notificationsService, supabase (auth)
Directory.jsx        -> propertiesService, businessesService
Recommendations.jsx  -> propertiesService, businessesService, recommendationsService, notificationsService, supabase (auth)
MyCard.jsx           -> propertiesService, businessesService, supabase (auth)
Profile.jsx          -> propertiesService, businessesService
BrowseProperties.jsx -> propertiesService, businessesService, postsService, recommendationsService
LandlordLogin.jsx    -> supabase (auth)
LandlordDashboard.jsx -> propertiesService, businessesService, recommendationsService, leasesService, paymentsService, unitsService
LandlordRequests.jsx -> propertiesService, businessesService, recommendationsService, supabase (direct query)
Accounting.jsx       -> propertiesService, businessesService, leasesService, recurringPaymentsService, invoicesService, expensesService, paymentsService, supabase (audit query)
AuditPage.jsx        -> supabase (direct audit_log query)
```

### Common Page Imports

Every page typically imports:
- `useQuery` (and often `useMutation`, `useQueryClient`) from `@tanstack/react-query`
- `useNavigate` (and sometimes `Link`) from `react-router-dom`
- At least one UI primitive from `@/components/ui/`
- Icons from `lucide-react` (commonly `Loader2`, `Building2`, `ArrowLeft`)
- `motion` from `framer-motion` (most pages, not all)

Landlord pages additionally import:
- `useProperty` from `@/lib/PropertyContext`
- `useAuth` from `@/lib/AuthContext`

## Where to Add New Code

### New Page/Route
1. Create `src/pages/{PageName}.jsx` (PascalCase)
2. Export a default functional component
3. The file is auto-registered in `src/pages.config.js` -- no manual edits needed
4. Access at `/{PageName}` URL
5. For tenant pages: use `const urlParams = new URLSearchParams(window.location.search)` for property ID
6. For landlord pages: add to `LANDLORD_PAGES` array in `src/App.jsx` and use `useProperty()` for property ID
7. Use `useQuery` for data fetching with `queryKey: ['{entity}', propertyId]`
8. Include `<BottomNav propertyId={propertyId} />` for tenant mobile nav

### New Landlord Page
1. Create page file in `src/pages/` as above
2. Add the page name to `LANDLORD_PAGES` array in `src/App.jsx` (line 44)
3. The route will automatically be wrapped in `<LandlordGuard>` and `<PropertyProvider>`
4. Use `const { activePropertyId: propertyId } = useProperty()` for property scoping
5. Use `const { user, isLandlord } = useAuth()` for auth state

### New Service
1. Create `src/services/{entity}.js` (camelCase)
2. Import `supabase` from `'./supabaseClient'`
3. Export a named object: `export const {entity}Service = { ... }`
4. Implement `filter()`, `getById()`, `create()`, `update()` methods following the pattern in `src/services/businesses.js`
5. For multiple related tables, use the factory pattern from `src/services/accounting.js`
6. All methods must throw on Supabase errors: `if (error) throw error`

### New Feature Component
1. Create `src/components/{ComponentName}.jsx` (PascalCase)
2. Accept props for data, callbacks (`onClose`, `onSubmit`), and loading states
3. Import UI primitives from `@/components/ui/`
4. Use default export
5. Import and use in page component(s)

### New Modal Dialog
1. Create `src/components/{FeatureName}Modal.jsx` or `src/components/{domain}/{ModalName}.jsx`
2. Use `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` from `@/components/ui/dialog`
3. Accept `isOpen`, `onClose`, `onSubmit`, `isLoading` props
4. Manage form state with `useState`
5. Call `onSubmit(formData)` on form submission
6. See `src/components/accounting/InvoiceModal.jsx` for reference

### New Accounting Feature
1. Create component in `src/components/accounting/`
2. If new table needed: add migration to `supabase/migrations/` and service to `src/services/`
3. Wire into `src/pages/Accounting.jsx` tab system

### New UI Primitive
1. Use shadcn/ui CLI: `npx shadcn@latest add {component-name}`
2. Or create manually in `src/components/ui/{component-name}.jsx` (kebab-case)
3. Base on Radix UI component
4. Use `cn()` from `@/lib/utils` for class merging
5. Use CVA for variants (see `src/components/ui/button.jsx` pattern)

### New Database Table
1. Create new migration file in `supabase/migrations/` with sequential number prefix (e.g., `005_description.sql`)
2. Include table creation, indexes, and RLS policies
3. Enable RLS: `alter table {name} enable row level security;`
4. Add at minimum a SELECT policy for authenticated users
5. Create corresponding service file in `src/services/`
6. Apply via Supabase SQL Editor (no CLI migration runner configured)

### New Custom Hook
1. Create `src/hooks/use-{name}.jsx` (kebab-case with `use-` prefix)
2. Follow React hooks naming convention
3. Return state/methods as needed

### New Utility Function
1. Add to `src/utils/index.ts` for general-purpose utilities
2. Or create `src/lib/{name}.js` for domain-specific constants/helpers
3. Use named exports

### New Guard Component
1. Create in `src/components/guards/{GuardName}.jsx`
2. Use React Router `<Outlet />` pattern (see `LandlordGuard.jsx`)
3. Wire into `src/App.jsx` route definitions

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
- Note: Excluded from `jsconfig.json` type checking. Do not manually edit.

### `supabase/migrations/`
- Purpose: Database schema definition, seed data, and RLS policies
- Generated: No (hand-written SQL)
- Committed: Yes
- Applied: Manually via Supabase SQL Editor (no CLI migration runner configured)

### `tests/`
- Purpose: E2E test files (Playwright)
- Generated: No
- Committed: Yes (when tests exist)

### `scripts/`
- Purpose: Utility scripts (SQL seeds, one-off tasks)
- Generated: No
- Committed: Yes

### `node_modules/`
- Purpose: NPM dependencies
- Generated: Yes (`npm install`)
- Committed: No

### `dist/`
- Purpose: Vite production build output
- Generated: Yes (`npm run build`)
- Committed: No

### `playwright-report/` and `test-results/`
- Purpose: Playwright test output
- Generated: Yes (by test runs)
- Committed: No

## Direct Supabase Client Usage

Some files bypass the service layer and import `supabase` directly from `@/services/supabaseClient`:
- `src/lib/AuthContext.jsx` -- for auth methods (appropriate)
- `src/lib/AuditLogger.js` -- for audit_log inserts (appropriate)
- `src/lib/PageNotFound.jsx` -- for auth check
- `src/pages/Community.jsx` -- for `auth.getSession()`/`auth.getUser()`
- `src/pages/Recommendations.jsx` -- for `auth.getSession()`/`auth.getUser()`
- `src/pages/MyCard.jsx` -- for `auth.getSession()`/`auth.getUser()`
- `src/pages/Register.jsx` -- for `auth.getSession()`/`auth.getUser()`
- `src/pages/LandlordLogin.jsx` -- for `auth.signInWithOtp()`
- `src/pages/LandlordRequests.jsx` -- for direct audit_log query
- `src/pages/Accounting.jsx` -- for direct audit_log query
- `src/pages/AuditPage.jsx` -- for direct audit_log query
- `src/components/PropertySwitcher.jsx` -- for direct properties query

---

*Structure analysis: 2026-03-27*
