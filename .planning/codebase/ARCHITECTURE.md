# Architecture

**Analysis Date:** 2026-03-25

## Pattern Overview

**Overall:** Modular React SPA with clear separation between presentation, data management, and backend integration layers. The application uses a Base44 SDK for backend integration and follows a page-based component architecture with centralized auth and query management.

**Key Characteristics:**
- Page-driven routing with auto-registration via filesystem convention
- React Context API for authentication state management
- React Query (TanStack Query) for server state management
- Component composition with Radix UI primitives and custom styling
- Base44 SDK integration for backend business logic and entities
- Permission-based conditional rendering based on authentication state

## Layers

**Presentation Layer (Pages & Components):**
- Purpose: User-facing UI and page-level composition
- Location: `src/pages/`, `src/components/`
- Contains: Page components, feature components, modal dialogs, UI primitives
- Depends on: React Query hooks, Auth context, Base44 SDK, UI component library
- Used by: React Router for routing, Layout wrapper for page wrapping

**Container/Feature Layer (Page Components):**
- Purpose: Orchestrate data fetching and business logic for specific pages
- Location: `src/pages/` (12 page files: Welcome.jsx, Register.jsx, Community.jsx, etc.)
- Contains: useQuery hooks for data fetching, useMutation for mutations, local state via useState, conditional rendering
- Depends on: Base44 SDK entities, React Query, React Router navigation
- Used by: App.jsx routing system

**Data Management Layer (React Query + Auth):**
- Purpose: Manage server state, caching, and synchronization
- Location: `src/lib/query-client.js`, `src/lib/AuthContext.jsx`
- Contains: QueryClient configuration, AuthProvider, useAuth hook
- Depends on: @tanstack/react-query, Base44 SDK for auth methods
- Used by: All page components for data operations

**Backend Integration Layer (Base44 SDK):**
- Purpose: Communicate with backend API and manage authentication
- Location: `src/api/base44Client.js`, `src/lib/AuthContext.jsx`
- Contains: Base44 SDK initialization, auth methods, entity access via SDK
- Depends on: @base44/sdk package, app parameters
- Used by: All business logic, AuthProvider, page components

**Utility & Configuration Layer:**
- Purpose: Shared helpers, routing config, and app initialization
- Location: `src/utils/`, `src/lib/`, `src/pages.config.js`
- Contains: Page routing config (auto-generated), app parameters, utility functions, NavigationTracker
- Depends on: React Router, Base44 SDK
- Used by: App.jsx, all page components

**UI Component Library (Presentation Primitives):**
- Purpose: Reusable UI building blocks with consistent styling
- Location: `src/components/ui/` (51 files: button.jsx, dialog.jsx, card.jsx, etc.)
- Contains: Radix UI-based components with CVA variants, styled with Tailwind CSS
- Depends on: Radix UI, class-variance-authority, Tailwind CSS
- Used by: All feature components and pages

## Data Flow

**Page Initialization & Authentication:**

1. Application starts at `src/main.jsx` → imports and renders `src/App.jsx`
2. `src/App.jsx` wraps application with AuthProvider → initializes authentication state
3. AuthProvider (`src/lib/AuthContext.jsx`) executes useEffect:
   - Checks app public settings via Base44 SDK
   - If token exists, verifies user authentication via `base44.auth.me()`
   - Sets auth state (user, isAuthenticated, authError)
4. AuthProvider provides useAuth hook for all downstream components
5. Router renders page based on URL via `src/pages.config.js` mapping
6. Layout wrapper applies consistent page structure

**Data Fetching Flow:**

1. Page component mounts (e.g., `src/pages/Community.jsx`)
2. Page uses useQuery hooks to fetch data from Base44 SDK entities:
   - `base44.entities.Property.filter({id: propertyId})`
   - `base44.entities.Business.filter({property_id: propertyId})`
   - `base44.entities.Post.filter({property_id: propertyId})`
3. React Query caches results, manages loading/error states, handles refetching
4. Component renders UI based on query state (loading spinner, error, data)
5. Navigation tracker logs user activity via `base44.appLogs.logUserInApp()`

**Mutation Flow:**

1. Page component uses useMutation hook for mutations
2. On form submission or action trigger, mutation calls Base44 SDK method:
   - `base44.entities.Business.create(formData)`
   - `base44.entities.Post.create(postData)`
3. On success, queryClient.invalidateQueries invalidates related cache
4. Related useQuery hooks automatically refetch and update UI
5. Toast notifications (via react-hot-toast or sonner) provide user feedback

**State Management:**
- Global: AuthProvider manages user auth state and app public settings
- Server: React Query manages all API response caching and synchronization
- Local: Component useState for form state, modal visibility, UI interactions
- Session: SessionStorage for landlord property context (e.g., LandlordDashboard)

## Key Abstractions

**AuthProvider (Authentication Context):**
- Purpose: Centralize auth state and provide useAuth hook to application
- Examples: `src/lib/AuthContext.jsx`
- Pattern: React Context + useState for managing user, token, loading states, auth errors
- Methods: checkAppState(), checkUserAuth(), logout(), navigateToLogin()

**Page Components (Route Handlers):**
- Purpose: Handle specific routes and orchestrate page-level functionality
- Examples: `src/pages/Community.jsx`, `src/pages/LandlordDashboard.jsx`, `src/pages/Accounting.jsx`
- Pattern: Functional component with useQuery/useMutation hooks, conditional rendering based on auth/data states
- Responsibility: Fetch data, manage form state, delegate UI rendering to feature components

**Feature Components (Domain-Specific):**
- Purpose: Encapsulate reusable domain logic (accounting, notifications, QR codes, etc.)
- Examples: `src/components/accounting/InvoiceModal.jsx`, `src/components/LandlordNotificationBell.jsx`, `src/components/BusinessQRCode.jsx`
- Pattern: Controlled components accepting props (isOpen, onClose, onSubmit, data), using React UI primitives
- Responsibility: Handle form validation, modal state, domain-specific rendering

**Modal Components (Dialog Pattern):**
- Purpose: Encapsulate form dialogs for create/edit operations
- Examples: `src/components/accounting/InvoiceModal.jsx`, `src/components/accounting/LeaseModal.jsx`, `src/components/CreatePostModal.jsx`
- Pattern: Controlled Dialog with form state, form validation, submit handling
- Responsibility: Accept parent callbacks for onClose/onSubmit, manage form data lifecycle

**Base44 SDK Client:**
- Purpose: Single entry point for all backend communication
- Example: `src/api/base44Client.js`
- Pattern: Module-level singleton initialized with app parameters
- Exports: `base44` instance with auth, entities, appLogs, and other SDK methods

**Query Client Configuration:**
- Purpose: Configure React Query behavior globally
- Example: `src/lib/query-client.js`
- Pattern: QueryClient instance with default options (refetchOnWindowFocus: false, retry: 1)
- Usage: Wrapped as provider in App.jsx

## Entry Points

**Application Entry:**
- Location: `src/main.jsx`
- Triggers: Browser page load
- Responsibilities: Mount React root, render App component, load global CSS

**App Component:**
- Location: `src/App.jsx`
- Triggers: Called from main.jsx
- Responsibilities: Set up global providers (AuthProvider, QueryClientProvider, Router), render authenticated routes, handle auth errors, provide Toast component

**Page Components:**
- Location: `src/pages/*.jsx` (12 files: Welcome, Register, Community, LandlordDashboard, etc.)
- Triggers: Router navigation via URL path
- Responsibilities: Fetch page-level data, manage page state, compose feature components

**AuthProvider:**
- Location: `src/lib/AuthContext.jsx`
- Triggers: Wraps entire application
- Responsibilities: Check app auth requirements, verify user authentication, provide auth state to all components

**NavigationTracker:**
- Location: `src/lib/NavigationTracker.jsx`
- Triggers: Renders in App.jsx, monitors location changes
- Responsibilities: Extract current page name, log user activity via Base44 SDK

## Error Handling

**Strategy:** Layered error handling with graceful degradation and user-facing feedback

**Patterns:**

**Authentication Errors:**
- Location: `src/lib/AuthContext.jsx`
- Handling: Try/catch blocks in useEffect, sets authError state with type and message
- Types: auth_required, user_not_registered, unknown
- Response: Conditional rendering of error UI (UserNotRegisteredError component) or redirect to login

**API Errors (useQuery/useMutation):**
- Location: All page components using useQuery/useMutation
- Handling: React Query automatically manages isError state, error object available
- Response: Pages render error UI with fallback data or empty state
- Example: `if (postsLoading) return <Loader2 />; if (posts.length === 0) return <EmptyState />`

**Form Validation Errors:**
- Location: Modal components (InvoiceModal, LeaseModal, etc.)
- Handling: Form-level validation before submit, field-level error messages
- Response: Toast notifications via sonner or react-hot-toast show validation messages

**Logging & Silent Failures:**
- Location: `src/lib/NavigationTracker.jsx`
- Pattern: Intentional silent failures for non-critical operations (e.g., appLogs)
- Code: `base44.appLogs.logUserInApp(pageName).catch(() => { /* Silently fail */ })`

## Cross-Cutting Concerns

**Logging:**
- Approach: Base44 SDK appLogs via NavigationTracker logs page visits
- Tracking: User activity logged when authenticated and navigation occurs
- Implementation: `base44.appLogs.logUserInApp(pageName)` called in useEffect

**Validation:**
- Form Validation: Component-level validation before useMutation, error messages in modals
- Data Validation: React Query handles API validation via Base44 SDK
- Type Safety: JSConfig provides path aliases and basic TypeScript checking

**Authentication:**
- Provider: AuthProvider context using Base44 SDK auth methods
- Token Management: Stored in localStorage via app-params module
- Protected Routes: AuthenticatedApp component checks isAuthenticated before rendering pages
- Session Management: Landlord flows use sessionStorage for property context

**Toast Notifications:**
- Framework: Toaster component wrapper (`src/components/ui/toaster.jsx`) for react-hot-toast/sonner
- Usage: Page components call toast() for user feedback on mutations
- Patterns: Success/error toasts shown on query invalidation

**Navigation:**
- Framework: React Router with page-based routing
- Auto-Loading: `src/pages.config.js` auto-registers pages from `src/pages/` folder
- URL Params: Query parameters pass context (propertyId, tab, entityId)
- Navigation Tracking: NavigationTracker monitors all route changes and logs activity

---

*Architecture analysis: 2026-03-25*
