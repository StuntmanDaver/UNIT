<!-- GSD:project-start source:PROJECT.md -->
## Project

**UNIT**

UNIT is a multi-tenant property community web application that connects business tenants within commercial properties. It enables tenants to discover neighboring businesses, publish community updates, submit operational requests, and share digital business profiles. It also provides landlord-facing workflows for tenant request management and basic property accounting. Built as a React SPA backed by Base44 entities and auth services.

**Core Value:** Every tenant business in a property has a discoverable digital presence, and the property can coordinate communication and operations in one shared application.

### Constraints

- **Tech stack**: Must work within Base44 BaaS ecosystem — no custom backend unless Base44 can't support server-side auth
- **Existing code**: Brownfield project — must preserve existing functionality while adding improvements
- **Publishing**: Deployed via Base44 Builder workflow — no custom CI/CD
- **Brand**: Established brand identity (navy-to-steel-blue gradient, "Where Tenants Connect") must be maintained
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- JavaScript (ES2022) - Frontend application
- JSX/TSX - React component syntax
- TypeScript - Type checking via JSConfig (not strict compilation)
## Runtime
- Node.js (used during build and development)
- Browser (ES2022 target)
- npm
- Lockfile: `package-lock.json` (inferred, present in npm projects)
## Frameworks
- React 18.2.0 - UI framework and component library
- React Router DOM 6.26.0 - Client-side routing
- React DOM 18.2.0 - React rendering engine
- Vite 6.1.0 - Build tool and dev server
- Base44 Vite Plugin 0.2.15 - Custom Vite plugin for Base44 integration
- TypeScript 5.8.2 - Type checking
- Tailwind CSS 3.4.17 - Utility-first CSS framework
- PostCSS 8.5.3 - CSS processing
- Autoprefixer 10.4.20 - Browser vendor prefixes
- Tailwind Animate 1.0.7 - Animation utilities
- React Hook Form 7.54.2 - Form state management
- React Hook Form Resolvers 4.1.2 - Validation resolvers
- Zod 3.24.2 - Schema validation
- TanStack React Query 5.84.1 - Server state management and caching
- Base44 SDK 0.8.3 - Backend client library for Base44 platform
- Radix UI (20+ component packages @ v1-2) - Unstyled, accessible component primitives
- Class Variance Authority 0.7.1 - CSS class composition
- CLSX 2.1.1 - Conditional CSS class utilities
- Tailwind Merge 3.0.2 - Merge Tailwind classes intelligently
- Embla Carousel React 8.5.2 - Carousel/carousel component
- Framer Motion 11.16.4 - Animation library
- Next Themes 0.4.4 - Dark mode/theme switching
- Vaul 1.1.2 - Drawer/modal component
- Commander (cmdk) 1.0.0 - Command palette/searchable menu
- React Markdown 9.0.1 - Markdown rendering
- React Quill 2.0.0 - Rich text editor
- HTML2Canvas 1.4.1 - HTML to image conversion
- jsPDF 4.0.0 - PDF generation
- Recharts 2.15.4 - Chart and graph library
- React Leaflet 4.2.1 - Map integration (Leaflet)
- Three.js 0.171.0 - 3D graphics
- Date-fns 3.6.0 - Date manipulation and formatting
- Moment 2.30.1 - Date library (legacy, coexists with date-fns)
- Lodash 4.17.21 - Utility functions
- React Day Picker 8.10.1 - Calendar picker component
- Input OTP 1.4.2 - OTP input component
- Canvas Confetti 1.9.4 - Confetti animation
- React Hot Toast 2.6.0 - Toast notifications
- Sonner 2.0.1 - Toast notification library
- Lucide React 0.475.0 - Icon library
- Hello Pangea DnD 17.0.0 - Drag and drop library
- ESLint 9.19.0 - JavaScript linting
- ESLint Plugin React 7.37.4 - React linting rules
- ESLint Plugin React Hooks 5.0.0 - React Hooks linting
- ESLint Plugin React Refresh 0.4.18 - Vite HMR refresh rules
- ESLint Plugin Unused Imports 4.3.0 - Remove unused imports
- Vite React Plugin 4.3.4 - React-specific Vite plugin
- Baseline Browser Mapping 2.8.32 - Browser compatibility mapping
- Globals 15.14.0 - Global variables for different environments
## Configuration
- Environment variables loaded via `import.meta.env` (Vite pattern)
- Configuration read from: `src/lib/app-params.js`
- Key env vars:
- Fallback to URL parameters: `app_id`, `access_token`, `from_url`, `functions_version`, `app_base_url`
- Storage: Browser localStorage with `base44_` prefix
- Entry point: `src/main.jsx`
- Output: Standard Vite dist folder
- Configuration: `vite.config.js`
- PostCSS: `postcss.config.js`
- Tailwind: `tailwind.config.js`
- ESLint: `eslint.config.js`
- `@/*` → `./src/*` (configured in jsconfig.json)
## Platform Requirements
- Node.js (version not specified in package.json)
- npm (for package management)
- Modern browser support (ES2022 target)
- CDN or static hosting capable of serving SPA
- Access to Base44 platform (for SDK functionality)
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
- Examples: `@/api/base44Client`, `@/components/PostCard`, `@/utils`, `@/lib/query-client`
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
- External dependencies like `@base44/sdk` and `@tanstack/react-query` provide type definitions
## Code Patterns in Practice
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Page-driven routing with auto-registration via filesystem convention
- React Context API for authentication state management
- React Query (TanStack Query) for server state management
- Component composition with Radix UI primitives and custom styling
- Base44 SDK integration for backend business logic and entities
- Permission-based conditional rendering based on authentication state
## Layers
- Purpose: User-facing UI and page-level composition
- Location: `src/pages/`, `src/components/`
- Contains: Page components, feature components, modal dialogs, UI primitives
- Depends on: React Query hooks, Auth context, Base44 SDK, UI component library
- Used by: React Router for routing, Layout wrapper for page wrapping
- Purpose: Orchestrate data fetching and business logic for specific pages
- Location: `src/pages/` (12 page files: Welcome.jsx, Register.jsx, Community.jsx, etc.)
- Contains: useQuery hooks for data fetching, useMutation for mutations, local state via useState, conditional rendering
- Depends on: Base44 SDK entities, React Query, React Router navigation
- Used by: App.jsx routing system
- Purpose: Manage server state, caching, and synchronization
- Location: `src/lib/query-client.js`, `src/lib/AuthContext.jsx`
- Contains: QueryClient configuration, AuthProvider, useAuth hook
- Depends on: @tanstack/react-query, Base44 SDK for auth methods
- Used by: All page components for data operations
- Purpose: Communicate with backend API and manage authentication
- Location: `src/api/base44Client.js`, `src/lib/AuthContext.jsx`
- Contains: Base44 SDK initialization, auth methods, entity access via SDK
- Depends on: @base44/sdk package, app parameters
- Used by: All business logic, AuthProvider, page components
- Purpose: Shared helpers, routing config, and app initialization
- Location: `src/utils/`, `src/lib/`, `src/pages.config.js`
- Contains: Page routing config (auto-generated), app parameters, utility functions, NavigationTracker
- Depends on: React Router, Base44 SDK
- Used by: App.jsx, all page components
- Purpose: Reusable UI building blocks with consistent styling
- Location: `src/components/ui/` (51 files: button.jsx, dialog.jsx, card.jsx, etc.)
- Contains: Radix UI-based components with CVA variants, styled with Tailwind CSS
- Depends on: Radix UI, class-variance-authority, Tailwind CSS
- Used by: All feature components and pages
## Data Flow
- Global: AuthProvider manages user auth state and app public settings
- Server: React Query manages all API response caching and synchronization
- Local: Component useState for form state, modal visibility, UI interactions
- Session: SessionStorage for landlord property context (e.g., LandlordDashboard)
## Key Abstractions
- Purpose: Centralize auth state and provide useAuth hook to application
- Examples: `src/lib/AuthContext.jsx`
- Pattern: React Context + useState for managing user, token, loading states, auth errors
- Methods: checkAppState(), checkUserAuth(), logout(), navigateToLogin()
- Purpose: Handle specific routes and orchestrate page-level functionality
- Examples: `src/pages/Community.jsx`, `src/pages/LandlordDashboard.jsx`, `src/pages/Accounting.jsx`
- Pattern: Functional component with useQuery/useMutation hooks, conditional rendering based on auth/data states
- Responsibility: Fetch data, manage form state, delegate UI rendering to feature components
- Purpose: Encapsulate reusable domain logic (accounting, notifications, QR codes, etc.)
- Examples: `src/components/accounting/InvoiceModal.jsx`, `src/components/LandlordNotificationBell.jsx`, `src/components/BusinessQRCode.jsx`
- Pattern: Controlled components accepting props (isOpen, onClose, onSubmit, data), using React UI primitives
- Responsibility: Handle form validation, modal state, domain-specific rendering
- Purpose: Encapsulate form dialogs for create/edit operations
- Examples: `src/components/accounting/InvoiceModal.jsx`, `src/components/accounting/LeaseModal.jsx`, `src/components/CreatePostModal.jsx`
- Pattern: Controlled Dialog with form state, form validation, submit handling
- Responsibility: Accept parent callbacks for onClose/onSubmit, manage form data lifecycle
- Purpose: Single entry point for all backend communication
- Example: `src/api/base44Client.js`
- Pattern: Module-level singleton initialized with app parameters
- Exports: `base44` instance with auth, entities, appLogs, and other SDK methods
- Purpose: Configure React Query behavior globally
- Example: `src/lib/query-client.js`
- Pattern: QueryClient instance with default options (refetchOnWindowFocus: false, retry: 1)
- Usage: Wrapped as provider in App.jsx
## Entry Points
- Location: `src/main.jsx`
- Triggers: Browser page load
- Responsibilities: Mount React root, render App component, load global CSS
- Location: `src/App.jsx`
- Triggers: Called from main.jsx
- Responsibilities: Set up global providers (AuthProvider, QueryClientProvider, Router), render authenticated routes, handle auth errors, provide Toast component
- Location: `src/pages/*.jsx` (12 files: Welcome, Register, Community, LandlordDashboard, etc.)
- Triggers: Router navigation via URL path
- Responsibilities: Fetch page-level data, manage page state, compose feature components
- Location: `src/lib/AuthContext.jsx`
- Triggers: Wraps entire application
- Responsibilities: Check app auth requirements, verify user authentication, provide auth state to all components
- Location: `src/lib/NavigationTracker.jsx`
- Triggers: Renders in App.jsx, monitors location changes
- Responsibilities: Extract current page name, log user activity via Base44 SDK
## Error Handling
- Location: `src/lib/AuthContext.jsx`
- Handling: Try/catch blocks in useEffect, sets authError state with type and message
- Types: auth_required, user_not_registered, unknown
- Response: Conditional rendering of error UI (UserNotRegisteredError component) or redirect to login
- Location: All page components using useQuery/useMutation
- Handling: React Query automatically manages isError state, error object available
- Response: Pages render error UI with fallback data or empty state
- Example: `if (postsLoading) return <Loader2 />; if (posts.length === 0) return <EmptyState />`
- Location: Modal components (InvoiceModal, LeaseModal, etc.)
- Handling: Form-level validation before submit, field-level error messages
- Response: Toast notifications via sonner or react-hot-toast show validation messages
- Location: `src/lib/NavigationTracker.jsx`
- Pattern: Intentional silent failures for non-critical operations (e.g., appLogs)
- Code: `base44.appLogs.logUserInApp(pageName).catch(() => { /* Silently fail */ })`
## Cross-Cutting Concerns
- Approach: Base44 SDK appLogs via NavigationTracker logs page visits
- Tracking: User activity logged when authenticated and navigation occurs
- Implementation: `base44.appLogs.logUserInApp(pageName)` called in useEffect
- Form Validation: Component-level validation before useMutation, error messages in modals
- Data Validation: React Query handles API validation via Base44 SDK
- Type Safety: JSConfig provides path aliases and basic TypeScript checking
- Provider: AuthProvider context using Base44 SDK auth methods
- Token Management: Stored in localStorage via app-params module
- Protected Routes: AuthenticatedApp component checks isAuthenticated before rendering pages
- Session Management: Landlord flows use sessionStorage for property context
- Framework: Toaster component wrapper (`src/components/ui/toaster.jsx`) for react-hot-toast/sonner
- Usage: Page components call toast() for user feedback on mutations
- Patterns: Success/error toasts shown on query invalidation
- Framework: React Router with page-based routing
- Auto-Loading: `src/pages.config.js` auto-registers pages from `src/pages/` folder
- URL Params: Query parameters pass context (propertyId, tab, entityId)
- Navigation Tracking: NavigationTracker monitors all route changes and logs activity
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
