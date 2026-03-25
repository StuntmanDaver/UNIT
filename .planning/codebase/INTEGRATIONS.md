# External Integrations

**Analysis Date:** 2026-03-25

## APIs & External Services

**Base44 Platform:**
- Base44 SDK - Primary backend integration for app functionality
  - SDK: `@base44/sdk` (v0.8.3)
  - Auth: Token-based via `appParams.token`
  - Client initialization: `src/api/base44Client.js`
  - Configuration: `VITE_BASE44_APP_ID`, `VITE_BASE44_FUNCTIONS_VERSION`, `VITE_BASE44_APP_BASE_URL`
  - Methods used: `base44.auth.me()`, `base44.auth.logout()`, `base44.auth.redirectToLogin()`

**HTTP Client:**
- Axios (via Base44 SDK)
  - Configured in: `src/lib/AuthContext.jsx`
  - Used for: App public settings endpoint (`/api/apps/public/prod/public-settings/by-id/{appId}`)
  - Base URL: Relative to app origin

## Data Fetching & Caching

**Query Client:**
- TanStack React Query (v5.84.1)
- Configuration: `src/lib/query-client.js`
- Default settings:
  - `refetchOnWindowFocus: false`
  - `retry: 1` on failure
- Used throughout: `useQuery`, `useMutation`, `useQueryClient` hooks

## Authentication & Identity

**Auth Provider:**
- Base44 SDK (custom auth integration)
  - Implementation: Context-based auth (`src/lib/AuthContext.jsx`)
  - User check: Via `base44.auth.me()`
  - Token handling: Stored in localStorage, passed via URL params
  - Token cleanup: Handled by `base44.auth.logout()`
  - Redirect to login: Via `base44.auth.redirectToLogin()`
  - App public settings: Endpoint requires `X-App-Id` header
  - Auth flow:
    1. Check app public settings (no token required)
    2. Check user authentication (if token available)
    3. Handle auth errors (403 with `auth_required` or `user_not_registered` reasons)

**Error Handling:**
- Auth context intercepts 401/403 status codes
- Special handling for `auth_required` and `user_not_registered` error reasons
- Public settings endpoint errors trigger error state

## UI/UX Libraries

**Notifications & Feedback:**
- React Hot Toast - Toast notifications
- Sonner - Alternative toast library
- Canvas Confetti - Celebration animations

**Maps & Location:**
- React Leaflet (v4.2.1)
- Leaflet maps integration

**Rich Content:**
- React Markdown - Markdown content rendering
- React Quill - Rich text editor for content creation
- HTML2Canvas - Export content to images
- jsPDF - Generate PDF documents

**Data Visualization:**
- Recharts (v2.15.4) - Charts and graphs
- Three.js (v0.171.0) - 3D graphics

## Monitoring & Observability

**Error Tracking:** Not detected

**Logs:**
- Console logging only (`console.error`, `console.log`)
- No centralized logging service configured

## CI/CD & Deployment

**Hosting:** Not detected in codebase

**CI Pipeline:** Not detected

**Build System:**
- Vite for development and production builds
- Custom Base44 Vite plugin for platform integration

## Environment Configuration

**Required env vars:**
- `VITE_BASE44_APP_ID` - Application identifier
- `VITE_BASE44_FUNCTIONS_VERSION` - Backend functions version
- `VITE_BASE44_APP_BASE_URL` - Base URL for app

**Runtime URL Parameters (optional, override env vars):**
- `app_id` - Override APP_ID
- `access_token` - Authentication token (removed from URL after read)
- `from_url` - Redirect destination after login
- `functions_version` - Override functions version
- `app_base_url` - Override app base URL
- `clear_access_token=true` - Clear stored token on load

**Secrets location:**
- `.env` or `.env.local` (not in repo, standard Vite pattern)
- URL parameters (for testing/temp tokens)
- localStorage with `base44_` prefix

## Navigation & Routing

**Page Navigation:**
- React Router DOM (v6.26.0)
- Configuration: `src/pages.config.js`
- Dynamic page routing from Pages object
- Main page configurable via `pages.config.js`

**Navigation Tracking:**
- Custom NavigationTracker component (`src/lib/NavigationTracker.jsx`)
- Integrates with Base44 platform for navigation events

## Data Models & State

**Server State:**
- TanStack React Query handles all API data fetching and caching

**Auth State:**
- AuthContext (`src/lib/AuthContext.jsx`)
  - User object
  - Authentication status
  - App public settings
  - Auth errors
  - Loading states

**UI Theme:**
- Next Themes (v0.4.4) for dark mode support

## Form Features

**Validation:**
- Zod (v3.24.2) for schema validation
- React Hook Form (v7.54.2) for form state and submission
- Hook Form Resolvers (v4.1.2) for validator integration

## Browser APIs Used

**Storage:**
- localStorage - Token and app parameter persistence
- URL parameters - Configuration and temporary token passing

**Page Visibility:**
- Likely used by NavigationTracker for app activity tracking

---

*Integration audit: 2026-03-25*
