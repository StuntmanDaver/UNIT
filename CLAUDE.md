<!-- GSD:project-start source:PROJECT.md -->
## Project

**UNIT**

UNIT is a multi-tenant property community web application that connects business tenants within commercial properties. It enables tenants to discover neighboring businesses, publish community updates, submit operational requests, and share digital business profiles. It also provides landlord-facing workflows for tenant request management, audit logging, and basic property accounting. Built as a React SPA backed by Supabase (PostgreSQL database, Auth, and Storage) with a thin service layer at `src/services/`.

**Core Value:** Every tenant business in a property has a discoverable digital presence, and the property can coordinate communication and operations in one shared application.

### Constraints

- **Tech stack**: Supabase for BaaS (PostgreSQL, Auth, Storage) — no custom backend needed
- **Existing code**: Brownfield project — must preserve existing functionality while adding improvements
- **Publishing**: Static SPA deployed to any hosting capable of serving Vite dist/ output
- **Brand**: Established brand identity (navy-to-steel-blue gradient, "Where Tenants Connect") must be maintained
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- JavaScript (ES2022) - Frontend application
- JSX - React component syntax
- TypeScript 5.8.2 - Type checking via JSConfig (not strict compilation)
- SQL - Database schema and migrations in `supabase/migrations/`
## Runtime
- Node.js (used during build and development)
- Browser (ES2022 target)
- npm
- Lockfile: `package-lock.json`
## Frameworks
- React 18.2.0 - UI framework and component library
- React Router DOM 6.26.0 - Client-side routing
- React DOM 18.2.0 - React rendering engine
- Vite 6.1.0 - Build tool and dev server
- @vitejs/plugin-react 4.3.4 - React-specific Vite plugin
- TypeScript 5.8.2 - Type checking
- Tailwind CSS 3.4.17 - Utility-first CSS framework
- PostCSS 8.5.3 - CSS processing
- Autoprefixer 10.4.20 - Browser vendor prefixes
- Tailwind Animate 1.0.7 - Animation utilities
- React Hook Form 7.54.2 - Form state management
- React Hook Form Resolvers 4.1.2 - Validation resolvers
- Zod 3.24.2 - Schema validation
- TanStack React Query 5.84.1 - Server state management and caching
- Supabase JS 2.100.0 - Backend client (auth, database, storage)
- Radix UI (20+ component packages @ v1-2) - Unstyled, accessible component primitives
- Class Variance Authority 0.7.1 - CSS class composition
- CLSX 2.1.1 - Conditional CSS class utilities
- Tailwind Merge 3.0.2 - Merge Tailwind classes intelligently
- Embla Carousel React 8.5.2 - Carousel component
- Framer Motion 11.16.4 - Animation library
- Next Themes 0.4.4 - Dark mode/theme switching
- Vaul 1.1.2 - Drawer/modal component
- Commander (cmdk) 1.0.0 - Command palette/searchable menu
- qrcode 1.5.4 - Standards-compliant QR code generation
- Recharts 2.15.4 - Chart and graph library
- Date-fns 3.6.0 - Date manipulation and formatting
- React Day Picker 8.10.1 - Calendar picker component
- Input OTP 1.4.2 - OTP input component
- React Hot Toast 2.6.0 - Toast notifications
- Sonner 2.0.1 - Toast notification library
- Lucide React 0.475.0 - Icon library
- Hello Pangea DnD 17.0.0 - Drag and drop library
- ESLint 9.19.0 - JavaScript linting
- ESLint Plugin React 7.37.4 - React linting rules
- ESLint Plugin React Hooks 5.0.0 - React Hooks linting
- ESLint Plugin React Refresh 0.4.18 - Vite HMR refresh rules
- ESLint Plugin Unused Imports 4.3.0 - Remove unused imports
- Globals 15.14.0 - Global variables for different environments
## Configuration
- Environment variables loaded via `import.meta.env` (Vite pattern)
- Required env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Storage: Supabase-managed auth sessions (localStorage)
- Entry point: `src/main.jsx`
- Output: Standard Vite dist folder
- Configuration: `vite.config.js`
- PostCSS: `postcss.config.js`
- Tailwind: `tailwind.config.js`
- ESLint: `eslint.config.js`
- `@/*` maps to `./src/*` (configured in jsconfig.json and vite.config.js)
## Platform Requirements
- Node.js (version not specified in package.json)
- npm (for package management)
- Modern browser support (ES2022 target)
- Static hosting capable of serving SPA
- Supabase project (database, auth, storage bucket `public-assets`)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- **Components:** PascalCase (e.g., `PostCard.jsx`, `CreatePostModal.jsx`, `BottomNav.jsx`)
- **Pages:** PascalCase (e.g., `Welcome.jsx`, `Profile.jsx`, `Community.jsx`)
- **Utils/Lib:** camelCase (e.g., `app-params.js`, `query-client.js`)
- **Hooks:** kebab-case with `use-` prefix (e.g., `use-mobile.jsx`)
- **UI Components:** kebab-case (e.g., `alert-dialog.jsx`, `radio-group.jsx`)
- camelCase for all functions (e.g., `getTypeConfig`, `handleSubmit`, `getCategoryLabel`)
- Prefix query hooks with `use` (e.g., `useIsMobile`, `useQuery`)
- Factory/utility functions use camelCase (e.g., `createPageUrl`, `createPageUrl`)
- camelCase for local variables (e.g., `isLoading`, `selectedType`, `propertyId`)
- UPPERCASE for constants (e.g., `MOBILE_BREAKPOINT`)
- CSS class variables written in camelCase when assigned to variables (e.g., `typeConfig.color`)
- PascalCase for TypeScript types and interfaces (not used in this project yet, but would follow React conventions)
- Generic component props follow camelCase
## Code Style
- No explicit Prettier configuration detected
- Code uses consistent 2-space indentation
- Line lengths vary; no enforced maximum observed
- JSX formatting spreads attributes on single lines for readability
- ESLint 9.19.0 with Flat Config (`eslint.config.js`)
- **Active plugins:**
- `unused-imports/no-unused-imports`: error - Enforces removal of unused imports
- `unused-imports/no-unused-vars`: warn - Allows underscore-prefixed unused params
- `react/jsx-uses-vars`: error - Prevents "unused" warnings on JSX-only imports
- `react/jsx-uses-react`: error - React import validation
- `react/prop-types`: off - Disabled (using TypeScript or no prop validation)
- `react/react-in-jsx-scope`: off - Not required in modern React
- `react/no-unknown-property`: error - Custom ignores for `cmdk-input-wrapper`, `toast-close`
- `react-hooks/rules-of-hooks`: error - Enforces React hooks rules strictly
## Import Organization
- `@/*` maps to `./src/*` (configured in `jsconfig.json`)
- All internal imports use the `@/` prefix for consistency
- Examples: `@/services/supabaseClient`, `@/components/PostCard`, `@/utils`, `@/lib/query-client`
- Default exports for components: `import PostCard from '@/components/PostCard'`
- Named exports for utilities: `import { useQuery, useMutation } from '@tanstack/react-query'`
- Mixed imports accepted when appropriate
## Error Handling
- No explicit try-catch blocks observed in current codebase
- **Query/async handling:** Uses `@tanstack/react-query` with `useQuery` and `useMutation`
- **Form submission:** Uses `e.preventDefault()` before processing
- **Validation:** No validation middleware observed; forms submit directly to mutations
- **Loading states:** Managed via `isLoading` from React Query, displayed as spinners or placeholder content
- No error callbacks in mutations (e.g., `onError` handlers)
- No error boundaries detected
- No user-facing error messages for failed API calls
- Failed queries default to React Query's built-in behavior (silent failures with empty data)
## Logging
- Minimal logging observed in source code
- No structured logging approach
- No log levels or log management
- Console logging would be acceptable for debugging but not production monitoring
## Comments
- Very minimal commenting observed in codebase
- Code is generally self-documenting through clear naming
- `pages.config.js` has extensive JSDoc-style comments explaining the auto-generated page routing system
- Not systematically used in current codebase
- No TypeScript usage yet (JavaScript with type checking via `jsconfig.json`)
- When documentation is added, should follow JSDoc 3 format
## Function Design
- Small focused functions (100-200 lines acceptable for page components)
- Complex pages like `Accounting.jsx` (496 lines) and `MyCard.jsx` (439 lines) indicate need for refactoring
- Utility functions typically 3-15 lines
- Props passed as single object (destructured in function signature)
- Example: `export default function PostCard({ post, business })`
- React hooks used for state management rather than function parameters
- URL parameters extracted via `URLSearchParams` in page components
- Components return JSX elements
- Utility functions return transformed data (strings, objects, arrays)
- Query functions return data or arrays
- No explicit `null` checks before returns; relies on optional chaining (`?.`)
## Module Design
- **Components:** Default export only
- **Utilities:** Named exports
- **API client:** Default export
- **Query client:** Named constant export
- `src/utils/index.ts` acts as a barrel file exporting utility functions
- `src/components/ui/*` are individual component files (no barrel file)
- Page routing handled by auto-generated `pages.config.js` (do not manually edit)
## TypeScript Usage
- Project configured with `jsconfig.json` (JavaScript + type checking)
- `checkJs: true` enables type checking on `.js` files
- No `.ts` or `.tsx` files in main codebase (except utilities `src/utils/index.ts`)
- Type information available from external libraries but not enforced in components
- New utility functions should use TypeScript (`.ts` extension) for better type safety
- Component files should continue using `.jsx` unless complex typing is needed
- External dependencies like `@supabase/supabase-js` and `@tanstack/react-query` provide type definitions
## Code Patterns in Practice
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Page-driven SPA with service layer abstraction over Supabase
- Filesystem-based route auto-registration via `src/pages.config.js`
- React Query (TanStack Query) for all server state management and caching
- Thin service layer wrapping Supabase client calls (`src/services/`)
- React Context for auth state only (AuthProvider / useAuth)
- Property-scoped data model — almost all queries filter by `property_id`
- Dual-role users: tenant (Supabase auth) and landlord (Supabase OTP + profiles table)
- Landlord routes protected by LandlordGuard + PropertyProvider components
## Layers
- Purpose: User-facing UI and page-level composition
- Location: `src/pages/` (13 pages), `src/components/`, `src/components/ui/` (49 files)
- Contains: Page components, feature components, modal dialogs, UI primitives
- Depends on: React Query hooks, service layer, Auth context, UI component library
- Used by: React Router for routing
- Purpose: Abstract Supabase database operations into domain-specific APIs
- Location: `src/services/` (11 modules)
- Contains: Service objects with async CRUD methods (filter, getById, create, update, delete)
- Depends on: `src/services/supabaseClient.js` (Supabase JS client singleton)
- Used by: Page components via React Query queryFn / mutationFn
- Purpose: Manage server state, caching, and synchronization
- Location: `src/lib/query-client.js`, `src/lib/AuthContext.jsx`
- Contains: QueryClient configuration, AuthProvider, useAuth hook
- Depends on: @tanstack/react-query, Supabase JS client
- Used by: All page components for data operations
- Purpose: Shared helpers, routing config, brand constants, app initialization
- Location: `src/utils/`, `src/lib/`, `src/pages.config.js`
- Contains: Page routing config (auto-generated), color system, utility functions, NavigationTracker, AuditLogger
- Depends on: React Router, Supabase JS client
- Used by: App.jsx, all page components
- Purpose: Reusable UI building blocks with consistent styling
- Location: `src/components/ui/` (49 files)
- Contains: Radix UI-based components with CVA variants, styled with Tailwind CSS
- Depends on: Radix UI, class-variance-authority, Tailwind CSS
- Used by: All feature components and pages
## Data Flow
- Global: AuthProvider manages user auth state via Supabase onAuthStateChange
- Server: React Query manages all API response caching and synchronization
- Local: Component useState for form state, modal visibility, UI interactions
- URL: Query parameters pass context (propertyId, tab, entityId)
- Mutations: useMutation wraps service calls -> queryClient.invalidateQueries on success -> toast notification
## Key Abstractions
- Purpose: Centralize auth state and provide useAuth hook to application
- Examples: `src/lib/AuthContext.jsx`
- Pattern: React Context + Supabase onAuthStateChange for session management
- Methods: checkAppState(), logout(), navigateToLogin()
- Provides: user, isAuthenticated, isLoadingAuth, isLandlord, userRole, propertyIds
- Purpose: Handle specific routes and orchestrate page-level functionality
- Examples: `src/pages/Community.jsx`, `src/pages/LandlordDashboard.jsx`, `src/pages/AuditPage.jsx`
- Pattern: Functional component with useQuery/useMutation hooks, service layer calls, conditional rendering
- Responsibility: Fetch data, manage form state, delegate UI rendering to feature components
- Purpose: Abstract Supabase operations into domain-specific APIs
- Examples: `src/services/businesses.js`, `src/services/accounting.js`
- Pattern: Exported object literal with async methods that call supabase.from().select/insert/update/delete
- Accounting uses factory pattern: createAccountingService(tableName) for 5 tables
- Purpose: Encapsulate form dialogs for create/edit operations
- Examples: `src/components/accounting/InvoiceModal.jsx`, `src/components/CreatePostModal.jsx`
- Pattern: Controlled Dialog with form state, validation, submit handling
- Purpose: Configure React Query behavior globally
- Example: `src/lib/query-client.js`
- Pattern: QueryClient instance with default options (refetchOnWindowFocus: false, retry: 1)
## Entry Points
- Location: `src/main.jsx`
- Triggers: Browser page load
- Responsibilities: Mount React root, render App component, load global CSS
- Location: `src/App.jsx`
- Triggers: Called from main.jsx
- Responsibilities: Set up providers (AuthProvider, QueryClientProvider, Router), define routes, wrap landlord pages in LandlordGuard + PropertyProvider
- Landlord pages: LandlordDashboard, LandlordRequests, Accounting, AuditPage
- Location: `src/pages/*.jsx` (13 files)
- Triggers: Router navigation via URL path
- Responsibilities: Fetch page-level data via service layer, manage page state, compose feature components
- Location: `src/lib/AuthContext.jsx`
- Triggers: Wraps entire application
- Responsibilities: Check Supabase session, manage auth state, fetch user profile for role/property_ids
## Error Handling
- Service layer: All services throw on Supabase errors (`if (error) throw error`)
- React Query: Catches thrown errors; exposes isError and error states
- Auth errors: Typed errors in AuthContext (auth_required, user_not_registered, unknown)
- Navigation tracking: Intentional silent failures via `.catch(() => {})`
- Toast: Two systems coexist (react-hot-toast and sonner)
- No error boundaries: Unhandled errors crash the entire app
## Cross-Cutting Concerns
- Navigation Tracking: `src/lib/NavigationTracker.jsx` logs page visits via `activityLogsService.logPageVisit()` for authenticated users
- Audit Logging: `src/lib/AuditLogger.js` provides `writeAudit()` for recording financial/request mutations to `audit_log` table
- Brand Theming: Brand colors in `tailwind.config.js` (brand-*); semantic color maps in `src/lib/colors.js`; CSS custom properties in `src/index.css`
- Property Scoping: Nearly all data scoped by property_id via URL query parameters (?propertyId=xxx)
- Route Protection: LandlordGuard verifies landlord role before rendering landlord pages
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

## Self-Correcting CLAUDE.md Rule

**Every time Claude gets something wrong about this project — a wrong file path, incorrect assumption, outdated pattern, misunderstood convention — add the correction directly to CLAUDE.md.** Do not just re-prompt or fix inline. Update this file so the correction persists across every future session, every subagent, and every teammate.

Over time, CLAUDE.md becomes a precision-tuned instruction set that makes Claude increasingly effective. This applies to all contributors: when you spot Claude making a recurring mistake, codify the fix here.
