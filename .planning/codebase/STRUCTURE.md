# Codebase Structure

**Analysis Date:** 2026-03-25

## Directory Layout

```
unit/
├── .git/                          # Git repository metadata
├── .gitignore                     # Git ignore rules
├── .planning/
│   └── codebase/                  # Codebase analysis documents
├── docs/                          # Documentation
├── src/
│   ├── api/                       # Backend integration (Base44 SDK client)
│   ├── components/                # React components (UI + feature components)
│   │   ├── accounting/            # Accounting/financial feature components
│   │   └── ui/                    # Reusable UI primitives (Radix-based)
│   ├── hooks/                     # Custom React hooks
│   ├── lib/                       # Shared utilities, config, providers
│   ├── pages/                     # Page components (route handlers)
│   ├── utils/                     # Shared utility functions
│   ├── App.jsx                    # Root app component with providers
│   ├── index.css                  # Global styles
│   ├── main.jsx                   # Entry point
│   └── pages.config.js            # Page routing configuration (auto-generated)
├── node_modules/                  # Dependencies
├── index.html                     # HTML entry point
├── package.json                   # Project manifest
├── package-lock.json              # Dependency lock file
├── jsconfig.json                  # JavaScript config (path aliases)
├── vite.config.js                 # Vite build config
├── postcss.config.js              # PostCSS config
├── tailwind.config.js             # Tailwind CSS config
├── eslint.config.js               # ESLint config
├── components.json                # UI component generation config
└── README.md                      # Project readme
```

## Directory Purposes

**src/api/**
- Purpose: Backend API client initialization
- Contains: Base44 SDK client instantiation
- Key files: `base44Client.js` - Singleton SDK instance
- Dependencies: @base44/sdk package, app parameters

**src/components/**
- Purpose: All React components organized by feature area
- Contains: 51 UI primitives + 7 accounting feature components + 15 business logic components
- Subdirectories: `ui/` (Radix-based primitives), `accounting/` (financial domain)
- Key files: See feature components breakdown below

**src/components/ui/**
- Purpose: Reusable UI primitives built on Radix UI
- Contains: 51 components (button, dialog, card, tabs, forms, etc.)
- Pattern: All use CSS Modules + Tailwind CSS + CVA for variants
- Usage: Imported by feature components for consistent styling

**src/components/accounting/**
- Purpose: Domain-specific accounting/financial modals and features
- Contains: 5 modal components (InvoiceModal, LeaseModal, RecurringPaymentModal, ExpenseModal, FinancialReports)
- Key files: 
  - `InvoiceModal.jsx` - Generate invoices with business/lease selection
  - `LeaseModal.jsx` - Create/edit lease agreements
  - `RecurringPaymentModal.jsx` - Set up recurring payments
  - `ExpenseModal.jsx` - Track property expenses
  - `FinancialReports.jsx` - Display financial dashboards and reports

**src/hooks/**
- Purpose: Custom React hooks for shared logic
- Contains: 1 hook currently
- Key files: `use-mobile.jsx` - Detect mobile viewport

**src/lib/**
- Purpose: Core utilities, providers, and configuration
- Contains: 6 files - authentication, query config, navigation tracking, parameter management
- Key files:
  - `AuthContext.jsx` - React Context for user authentication and app state
  - `query-client.js` - React Query configuration
  - `app-params.js` - Load app parameters from URL/localStorage
  - `NavigationTracker.jsx` - Track and log page navigation
  - `PageNotFound.jsx` - 404 fallback page
  - `utils.js` - Shared utility functions (cn, isIframe)

**src/pages/**
- Purpose: Route handler components - one component per page/route
- Contains: 12 page components representing main app flows
- Key files:
  - `Welcome.jsx` - Landing/onboarding page
  - `Register.jsx` - User registration flow (step-based)
  - `Community.jsx` - Community posts and engagement
  - `LandlordDashboard.jsx` - Landlord property management dashboard
  - `LandlordLogin.jsx` - Landlord authentication
  - `Accounting.jsx` - Financial management (invoices, leases, payments)
  - `Profile.jsx` - User profile management
  - `MyCard.jsx` - Business card generation and management
  - `BrowseProperties.jsx` - Property listing and search
  - `Directory.jsx` - Business directory
  - `Recommendations.jsx` - Property/business recommendations
  - `LandlordRequests.jsx` - Landlord requests/work orders
- Pattern: Each page uses useQuery/useMutation for data, renders feature components

**src/utils/**
- Purpose: Shared utility functions
- Contains: 1 utility file
- Key files: `index.ts` - Helper for generating page URLs from page names

## Key File Locations

**Entry Points:**
- `src/main.jsx` - React root mount and initialization
- `src/App.jsx` - Root component with all providers (Auth, QueryClient, Router)
- `index.html` - HTML template for Vite SPA

**Configuration:**
- `src/lib/app-params.js` - Load Base44 app configuration from URL/localStorage
- `src/pages.config.js` - Auto-generated page routing map (auto-registers pages from src/pages/)
- `vite.config.js` - Vite build and dev server config
- `jsconfig.json` - Path aliases (@/* → ./src/*)
- `tailwind.config.js` - Tailwind CSS customization
- `eslint.config.js` - ESLint rules

**Core Logic:**
- `src/lib/AuthContext.jsx` - Authentication provider and user state management
- `src/lib/query-client.js` - React Query global configuration
- `src/api/base44Client.js` - Base44 SDK initialization
- `src/lib/NavigationTracker.jsx` - Analytics and navigation tracking

**Styles:**
- `src/index.css` - Global CSS and Tailwind directives
- `postcss.config.js` - PostCSS plugins (Tailwind, autoprefixer)
- `tailwind.config.js` - Tailwind configuration

## Naming Conventions

**Files:**
- Components: PascalCase (e.g., `Welcome.jsx`, `InvoiceModal.jsx`, `NotificationBell.jsx`)
- Pages: PascalCase, single noun or clear purpose (e.g., `Community.jsx`, `LandlordDashboard.jsx`)
- Utilities: camelCase (e.g., `index.ts`, `app-params.js`)
- Hooks: Kebab-case (e.g., `use-mobile.jsx`)

**Directories:**
- Feature directories: kebab-case or descriptive plural (e.g., `components/accounting/`, `src/pages/`)
- Utility directories: descriptive plural (e.g., `src/utils/`, `src/hooks/`)

**Components & Functions:**
- React components: PascalCase (exported as default)
- Hooks: camelCase with `use` prefix (e.g., `useAuth`, `useMobile`)
- Utility functions: camelCase (e.g., `createPageUrl`, `cn`)
- Constants: UPPER_SNAKE_CASE (e.g., `mainPageKey`)

**CSS Classes:**
- Utility-first Tailwind classes throughout
- No custom CSS classes in source components (CV A for component variants)
- BEM-style naming avoided (Tailwind handles it)

## Where to Add New Code

**New Page/Route:**
1. Create new file in `src/pages/` with PascalCase name (e.g., `Settings.jsx`)
2. Export default functional component with page logic
3. File is auto-registered in `src/pages.config.js`
4. Access via route `/{PageName}` (spaces become hyphens)
5. Use `useQuery` for data fetching, render feature components

**New Feature Component:**
1. Create in `src/components/{feature-area}/` (e.g., `src/components/notifications/NotificationPanel.jsx`)
2. Accept props for open state, callbacks (onClose, onSubmit)
3. Use Radix UI primitives from `src/components/ui/` for base components
4. Apply Tailwind CSS for styling
5. Import in page component and render conditionally

**New UI Component Primitive:**
1. Create in `src/components/ui/{component-name}.jsx`
2. Base on Radix UI component
3. Use CVA for variants (see `button.jsx` pattern)
4. Apply Tailwind CSS classes
5. Export as default, no external state (dumb component)
6. Use in feature components and pages

**New Utility Function:**
1. Add to `src/utils/index.ts` if general purpose
2. Or create domain-specific file (e.g., `src/utils/form-validators.ts`)
3. Use camelCase naming
4. Export from index for easy imports
5. Call from page/component logic

**New Hook:**
1. Create in `src/hooks/{hook-name}.jsx`
2. Name with `use` prefix (e.g., `usePropertyData.jsx`)
3. Encapsulate useQuery/useMutation + business logic
4. Return object with state and methods
5. Import and call in page/component

**Database Query/Mutation:**
1. Call `base44.entities.{EntityName}.{method}()` directly from page/component
2. Wrap in `useQuery` for fetches, `useMutation` for mutations
3. Use queryClient.invalidateQueries() after mutations
4. Define queryKey consistently: `[entityType, filter, sortKey]` pattern

**New Modal Dialog:**
1. Create in `src/components/{feature}/` or `src/components/accounting/` for finance
2. Use Dialog, DialogContent, DialogHeader from `src/components/ui/dialog`
3. Accept props: `isOpen`, `onClose`, `onSubmit`, loading state, data
4. Manage form state internally with useState
5. Call onSubmit callback with formData on submission

## Special Directories

**node_modules/:**
- Purpose: NPM dependencies
- Generated: Yes (by npm install)
- Committed: No (excluded via .gitignore)
- Management: Via package.json and package-lock.json

**.planning/codebase/:**
- Purpose: Codebase analysis documents (generated by GSD)
- Generated: Yes (by mapper agent)
- Committed: Yes
- Files: STACK.md, INTEGRATIONS.md, ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

**docs/:**
- Purpose: Project documentation
- Generated: Manual (user-created)
- Committed: Yes
- Content: Project guides, API documentation, design specs

## Path Aliases

**Configuration:** `jsconfig.json` defines `@/*` → `./src/*`

**Usage:** Import from root of src
```javascript
// Instead of:
import { Button } from '../../../components/ui/button'

// Use:
import { Button } from '@/components/ui/button'
```

**Applied to:**
- All component imports
- All utility imports
- All hook imports
- All API imports

---

*Structure analysis: 2026-03-25*
