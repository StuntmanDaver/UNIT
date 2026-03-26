# Testing Patterns

**Analysis Date:** 2026-03-25

## Overview

The UNIT project has **zero test infrastructure**. There are no test files, no test framework configured, no test runner, no CI/CD pipeline, and no coverage tooling. The project contains no unit tests, integration tests, or end-to-end tests. Zod and React Hook Form are installed as dependencies but neither is used for validation in the current codebase. The only quality gate is ESLint linting (`npm run lint`).

## Test Framework

**Runner:** Not installed. No `jest`, `vitest`, `mocha`, or any test runner in `package.json`.

**Assertion Library:** Not installed.

**Run Commands:**
```bash
npm run lint              # Only quality check available (ESLint)
npm run lint:fix          # Auto-fix lint issues
npm run typecheck         # TypeScript type checking via jsconfig.json
```

No `test` script exists in `package.json`.

## Test File Organization

**Location:** No test files exist anywhere in `src/`.

**Naming:** N/A -- no convention established.

**Structure:** N/A.

## Test Structure

No tests exist to analyze.

## Mocking

**Framework:** Not installed.

**What would need mocking for future tests:**
- `@supabase/supabase-js` -- The Supabase client is initialized in `src/services/supabaseClient.js` and imported by all service files
- `@tanstack/react-query` -- Used by all page and feature components
- `react-router-dom` -- `useNavigate`, `useLocation`, `Link` used throughout
- `window.location.search` -- URL params are read via `new URLSearchParams(window.location.search)` directly in page components
- `sessionStorage` -- Used for landlord auth state in `src/pages/LandlordDashboard.jsx`

## Fixtures and Factories

**Test Data:** None. No fixtures, factories, or seed data utilities for testing.

**Database seed:** `supabase/migrations/002_seed_properties.sql` exists for seeding property data in the Supabase database but is not a test fixture.

## Coverage

**Requirements:** None enforced. No coverage thresholds configured.

**View Coverage:** N/A -- no coverage tooling installed.

## Test Types

**Unit Tests:** None.

**Integration Tests:** None.

**E2E Tests:** None. No Cypress, Playwright, or similar E2E framework installed.

## What Is Tested vs Untested

**Tested:**
- ESLint linting on `src/components/**` and `src/pages/**` (via `npm run lint`)
- Type checking on select files via `jsconfig.json` with `checkJs: true` (via `npm run typecheck`)

**Untested (everything else):**

| Layer | Files | Risk Level |
|-------|-------|------------|
| Service layer (Supabase CRUD) | `src/services/*.js` (11 files) | High -- data access with no validation |
| Auth flow | `src/lib/AuthContext.jsx` | High -- login/logout/session management |
| Page components | `src/pages/*.jsx` (12 files, 4147 LOC total) | Medium -- complex state + data flow |
| Feature components | `src/components/*.jsx` (16 files, 2069 LOC total) | Medium -- modals, forms, notifications |
| Utility functions | `src/utils/index.ts`, `src/lib/utils.js`, `src/lib/colors.js` | Low -- simple pure functions |
| UI primitives | `src/components/ui/*.jsx` (51+ files) | Low -- third-party shadcn components |
| Routing config | `src/pages.config.js`, `src/App.jsx` | Low -- auto-generated + minimal logic |

## Testing Gaps and Recommendations

### Critical Gaps

**1. Service Layer Has No Tests**
- Files: `src/services/posts.js`, `src/services/businesses.js`, `src/services/accounting.js`, `src/services/notifications.js`, `src/services/units.js`, `src/services/properties.js`, `src/services/recommendations.js`, `src/services/storage.js`, `src/services/ads.js`, `src/services/activityLogs.js`
- Risk: Every service method follows the same `if (error) throw error` pattern, but there is no validation on inputs, no type checking on filter parameters, and no tests verifying correct Supabase query construction
- Impact: Bugs in filter logic, wrong column names, or Supabase schema mismatches would only be caught in production

**2. Auth Flow Has No Tests**
- Files: `src/lib/AuthContext.jsx`
- Risk: The `checkAppState`, `logout`, and `onAuthStateChange` listener have try-catch error handling with multiple state transitions, but none of this is tested
- Impact: Auth regressions (login failures, session expiry handling, redirect loops) would be invisible

**3. Form Submission Has No Validation Tests**
- Files: `src/components/CreatePostModal.jsx`, `src/components/accounting/InvoiceModal.jsx`, `src/components/accounting/LeaseModal.jsx`, `src/components/accounting/ExpenseModal.jsx`, `src/components/accounting/RecurringPaymentModal.jsx`
- Risk: Forms rely only on HTML `required` attributes. No schema validation, no field-level error display, no tests for invalid data scenarios
- Impact: Invalid or malformed data can be submitted to Supabase

**4. No Mutation Error Handling Tests**
- Files: All page components using `useMutation`
- Risk: No `onError` callbacks exist on any mutation. If a Supabase call fails, there is no user feedback and no fallback behavior
- Impact: Users see no indication of failure; data may be lost

### Recommended Test Setup

**Framework recommendation:** Vitest (native Vite integration, fast, compatible with existing setup)

**Installation:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Configuration (`vitest.config.js`):**
```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
  }
});
```

**Priority test targets (in order):**

1. **Service layer unit tests** -- Mock Supabase client, verify query construction and error handling
   - Location: `src/services/__tests__/*.test.js`
   - Pattern: Mock `supabase.from().select()` chain, verify filter/order/limit calls

2. **Auth context tests** -- Verify session handling, error classification, state transitions
   - Location: `src/lib/__tests__/AuthContext.test.jsx`

3. **Form modal component tests** -- Verify form submission, validation, loading states
   - Location: `src/components/__tests__/*.test.jsx`

4. **Page component integration tests** -- Verify data fetching + rendering + user interactions
   - Location: `src/pages/__tests__/*.test.jsx`

### Suggested `package.json` Script Additions

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

## CI/CD Testing Pipeline

**Current state:** No CI/CD pipeline exists. The project has no `.github/workflows/`, no CircleCI config, no Jenkins files. Deployment happens via manual process.

**Recommended minimum CI checks:**
1. `npm run lint` -- Already works
2. `npm run typecheck` -- Already works
3. `npm run test` -- Requires test setup above
4. `npm run build` -- Verify production build succeeds

## Key Findings

- **Zero test coverage** across 6,554+ lines of application source code (pages + components + services)
- **No test framework** is installed or configured
- **Zod is installed but unused** -- it could be leveraged for runtime validation and form schema testing
- **React Hook Form is installed but unused** -- could replace manual `useState` form handling and provide built-in validation
- **The service layer** (`src/services/`) is the easiest and highest-value target for initial test coverage -- pure functions with predictable inputs/outputs
- **ESLint is the only automated quality gate** -- it catches unused imports and basic React issues but nothing behavioral
- **No error boundaries** exist in the component tree, meaning unhandled render errors crash the entire app

---

*Testing analysis: 2026-03-25*
