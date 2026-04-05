# Testing Patterns

**Analysis Date:** 2026-03-27

## Test Framework

**E2E Runner:**
- Playwright 1.58.2 (installed as both `playwright` and `@playwright/test` in devDependencies)
- Config: `playwright.config.js`
- Test directory: `tests/`

**Unit/Integration Runner:** Not installed. No Vitest, Jest, or Mocha configured.

**Assertion Library:**
- Playwright's built-in `expect` (for E2E tests)
- No assertion library for unit tests

**Run Commands:**
```bash
npx playwright test                    # Run all E2E tests
npx playwright test --headed           # Run with browser visible
npx playwright show-report             # View last HTML report
npm run lint                           # ESLint (only automated quality check besides E2E)
npm run lint:fix                       # Auto-fix lint issues
npm run typecheck                      # TypeScript type checking via jsconfig.json
```

No `test` script exists in `package.json` scripts. Playwright is run via `npx` directly.

## Test File Organization

**Location:**
```
tests/
└── landlord-login.spec.js    # E2E: landlord magic link login flow
```

**Related directories:**
```
playwright-report/             # HTML report output (generated, not committed)
├── index.html
└── data/
test-results/                  # Test artifacts (generated, not committed)
├── .last-run.json
└── landlord-login-.../        # Screenshot/trace artifacts per test
scripts/
└── seed-landlord.sql          # SQL seed data for test setup
```

**Naming Convention:**
- E2E test files: `{feature}.spec.js` (e.g., `landlord-login.spec.js`)

## Playwright Configuration

**File:** `playwright.config.js`

```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Key Settings:**
- Tests run against `http://localhost:5173` (Vite dev server)
- Auto-starts dev server if not running
- Chromium only (no Firefox/WebKit projects)
- HTML reporter with trace on first retry
- CI mode: `forbidOnly`, 2 retries, 1 worker

## Existing Test: Landlord Login E2E

**File:** `tests/landlord-login.spec.js`

**What it tests:**
1. Navigate to `/LandlordLogin` page
2. Enter landlord email in the form
3. Click "Send Magic Link" button
4. Verify "Check your email" confirmation screen
5. Generate magic link via Supabase Admin API (bypasses email inbox)
6. Navigate to the magic link URL
7. Verify redirect to `/LandlordDashboard`
8. Verify dashboard renders with property data (Occupancy, Tenants, Monthly Revenue)
9. Verify Logout button is present (confirms authenticated session)

**Environment Requirements:**
```bash
# Required env vars for running this test
VITE_SUPABASE_URL=<supabase-project-url>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>  # Admin API access
TEST_LANDLORD_EMAIL=<email>                    # Defaults to landlord@example.com
```

**Pattern used:**
```javascript
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Helper function for Supabase Admin client (service role key)
function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

test.describe('Landlord Magic Link Login', () => {
  test('full login flow: send magic link -> land on dashboard', async ({ page }) => {
    await page.goto('/LandlordLogin');
    await expect(page.getByRole('heading', { name: 'Landlord Access' })).toBeVisible();
    // ... fill form, click button, generate admin magic link, navigate, verify dashboard
  });
});
```

**Last Run Status:** Failed (per `test-results/.last-run.json`)

**Seed Data:** `scripts/seed-landlord.sql` provides SQL for seeding a test landlord account in Supabase.

## Test Structure Patterns

**Describe blocks:** Use `test.describe('Feature Name', () => { ... })` for grouping
**Test names:** Descriptive with flow steps: `'full login flow: send magic link -> land on dashboard with property data'`
**Assertions:** Use Playwright's `expect` with role-based locators:
```javascript
await expect(page.getByRole('heading', { name: 'Landlord Access' })).toBeVisible();
await expect(page.getByText('Occupancy')).toBeVisible();
await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
```
**Timeouts:** Explicit timeouts for navigation waits:
```javascript
await page.waitForURL('**/LandlordDashboard**', { timeout: 15000 });
await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
```

## Mocking

**E2E Tests:** No mocking -- tests run against a live Supabase instance. The admin client uses the service role key to generate magic links, bypassing email delivery.

**Unit Test Mocking (not yet set up):** When unit tests are added, the following would need mocking:
- `@supabase/supabase-js` -- The client is a singleton at `src/services/supabaseClient.js`
- `@tanstack/react-query` -- Used by all page and feature components
- `react-router-dom` -- `useNavigate`, `useLocation`, `Link` used throughout
- `window.location.search` -- URL params read via `new URLSearchParams(window.location.search)` in tenant pages
- `localStorage` -- Used by `PropertyContext.jsx` for active property persistence

## Fixtures and Factories

**Seed Data:**
- `scripts/seed-landlord.sql` -- SQL for creating a test landlord in the Supabase database
- `supabase/migrations/` -- Contains migration files including seed data (`002_seed_properties.sql`)

**Test Data Factories:** None. No JavaScript factories or fixture generators exist.

## Coverage

**Requirements:** None enforced. No coverage thresholds configured.
**Tooling:** No coverage tool installed (no `@vitest/coverage-v8`, no `istanbul`, etc.)

## Test Types

**Unit Tests:** None. No unit test framework installed.

**Integration Tests:** None.

**E2E Tests:**
- Framework: Playwright 1.58.2
- Tests: 1 test file with 1 test case (`tests/landlord-login.spec.js`)
- Scope: Landlord authentication flow only
- Browser: Chromium only

## What Is Tested vs Untested

**Tested (automated):**

| What | How | Files |
|------|-----|-------|
| ESLint rules | `npm run lint` | `src/components/**`, `src/pages/**` |
| Type checking | `npm run typecheck` | Files included in `jsconfig.json` |
| Landlord login E2E | Playwright | `tests/landlord-login.spec.js` |

**Untested (no automated coverage):**

| Layer | Files | Risk Level |
|-------|-------|------------|
| Service layer (Supabase CRUD) | `src/services/*.js` (11 files) | **High** -- data access with no input validation |
| Auth flow (beyond login) | `src/lib/AuthContext.jsx` | **High** -- session management, role detection, logout |
| Property context | `src/lib/PropertyContext.jsx` | **High** -- property switching, localStorage sync |
| Landlord guard | `src/components/guards/LandlordGuard.jsx` | **High** -- route protection logic |
| Page components | `src/pages/*.jsx` (13 files, ~4300 LOC) | **Medium** -- complex state + data flow |
| Feature components | `src/components/*.jsx` (19 files, ~2200 LOC) | **Medium** -- modals, forms, notifications |
| Accounting modals | `src/components/accounting/*.jsx` (5 files) | **Medium** -- form data handling |
| Audit logging | `src/lib/AuditLogger.js` | **Medium** -- fire-and-forget writes |
| Utility functions | `src/utils/index.ts`, `src/lib/utils.js`, `src/lib/colors.js` | **Low** -- simple pure functions |
| UI primitives | `src/components/ui/*.jsx` (49 files) | **Low** -- third-party shadcn |
| Routing config | `src/pages.config.js`, `src/App.jsx` | **Low** -- auto-generated + minimal |

## Gaps and Recommendations

### Critical Gaps

**1. Service Layer Has No Tests**
- Files: All 11 files in `src/services/`
- Risk: No validation on inputs, no type checking on filter parameters, no tests verifying correct Supabase query construction
- Impact: Bugs in filter logic, wrong column names, or schema mismatches caught only in production

**2. Auth Flow Has Minimal E2E Coverage**
- Files: `src/lib/AuthContext.jsx`, `src/components/guards/LandlordGuard.jsx`
- Risk: Only the happy-path login is tested. Session expiry, logout, role changes, unauthorized access, and error states are untested
- Impact: Auth regressions invisible

**3. Form Submission Has No Validation Tests**
- Files: `src/components/CreatePostModal.jsx`, `src/components/accounting/InvoiceModal.jsx`, `src/components/accounting/LeaseModal.jsx`, `src/components/accounting/ExpenseModal.jsx`, `src/components/accounting/RecurringPaymentModal.jsx`, `src/components/CreateRecommendationModal.jsx`
- Risk: Forms rely only on HTML `required` attributes. No schema validation, no field-level error display
- Impact: Invalid or malformed data can be submitted to Supabase

**4. No Mutation Error Handling Tests**
- Files: All page components using `useMutation`
- Risk: No `onError` callbacks exist on any mutation. If a Supabase call fails, there is no user feedback
- Impact: Users see no indication of failure; data may be lost

**5. Tenant-Side Flows Completely Untested**
- Files: `src/pages/Community.jsx`, `src/pages/Directory.jsx`, `src/pages/Register.jsx`, `src/pages/Recommendations.jsx`, `src/pages/MyCard.jsx`, `src/pages/Profile.jsx`
- Risk: No E2E or integration tests for any tenant workflows
- Impact: Regressions in core tenant features go undetected

### Recommended Test Setup (Unit/Integration)

**Framework:** Vitest (native Vite integration, uses same `vite.config.js` resolution)

**Installation:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @testing-library/user-event
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

### Recommended E2E Expansion

**Add these Playwright tests next:**
1. Tenant registration flow (`/Register` page)
2. Community post creation flow (`/Community` page)
3. Landlord request management flow (`/LandlordRequests` page)
4. Accounting CRUD operations (`/Accounting` page)
5. Property switching for multi-property landlords

**Suggested `package.json` script additions:**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "npx playwright test",
    "test:e2e:headed": "npx playwright test --headed",
    "test:e2e:report": "npx playwright show-report"
  }
}
```

## CI/CD Testing Pipeline

**Current state:** No CI/CD pipeline exists. No `.github/workflows/`, no CircleCI config, no deployment automation.

**Recommended minimum CI checks:**
1. `npm run lint` -- Already works
2. `npm run typecheck` -- Already works
3. `npm run test` -- Requires Vitest setup above
4. `npm run build` -- Verify production build succeeds
5. `npx playwright test` -- E2E tests (requires Supabase test environment)

## Key Findings

- **Playwright E2E testing has been bootstrapped** with one test covering landlord login flow
- **Zero unit/integration test coverage** across ~6,500 lines of application source code
- **No unit test framework** is installed or configured
- **Zod is installed but unused** -- could be leveraged for runtime validation and schema testing
- **React Hook Form is installed but unused** -- only referenced in the shadcn `form.jsx` UI primitive
- **The service layer** (`src/services/`) is the highest-value target for initial unit test coverage
- **ESLint + Playwright are the only automated quality gates**
- **No error boundaries** in the component tree -- unhandled render errors crash the entire app
- **The existing E2E test last failed** -- the test infrastructure needs maintenance

---

*Testing analysis: 2026-03-27*
