# Phase 03: Quality & Reliability - Research

**Researched:** 2026-04-03
**Domain:** Vitest unit testing, React error boundaries, React.lazy code splitting, QR code decode verification
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Test only critical business logic — LandlordGuard, AuditLogger, SLA deadline calculation (`getSlaDeadline`), and invoice state transitions (`transitionInvoiceStatus`, `ALLOWED_TRANSITIONS`). Service layer CRUD operations are thin Supabase wrappers and not worth unit testing.
- **D-02:** Full mocks for all tests. Mock the Supabase client completely — no test database, no network calls. Tests must run without hitting the live API.
- **D-03:** Use Vitest as the test framework. Install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@testing-library/user-event`.
- **D-04:** Test file location: `src/__tests__/` directory. Naming: `{module}.test.js` for pure logic, `{Component}.test.jsx` for component tests.
- **D-05:** Error boundaries at page-level AND critical sections. Every page route gets an error boundary. Additionally, targeted boundaries around accounting modals, request forms, and the audit timeline component.
- **D-06:** Fallback UI is a branded error card. Card with UNIT branding (brand-navy background for landlord pages, light for tenant), "Something went wrong" message, and a "Reload page" button. Consistent with existing brand patterns.
- **D-07:** Error boundary component is reusable — single `ErrorBoundary` component with a prop for fallback variant (page-level vs section-level).
- **D-08:** Automated decode verification in the test suite. Generate QR codes programmatically, decode them, and verify the encoded content matches the expected business card URL. Catches encoding regressions in CI.
- **D-09:** Keep current QR code generation as-is. No style changes unless tests reveal scan failures. The `qrcode` library default output is standard-compliant.
- **D-10:** Lazy-load landlord routes only: Accounting, LandlordDashboard, LandlordRequests, AuditPage. Tenant routes stay in the main bundle.
- **D-11:** Loading fallback is a branded spinner — centered Loader2 icon with brand-navy background. Matches existing loading patterns.
- **D-12:** Use `React.lazy()` + `Suspense` at the route level in `App.jsx`. No changes to the page components themselves.

### Claude's Discretion
- Vitest configuration details (globals, setup files, coverage thresholds)
- Error boundary class component implementation vs using a library like `react-error-boundary`
- QR decode library choice for automated verification (e.g., `jsqr`, `qrcode-reader`)
- Which specific accounting modals and request forms get section-level error boundaries
- Suspense boundary placement (wrapping individual routes vs route groups)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QUAL-01 | Automated test suite covers critical user paths (tenant onboarding, directory, community posts, landlord dashboard) | Vitest + RTL stack documented; mock patterns for Supabase and React Router confirmed; specific test targets from D-01 identified in source |
| QUAL-02 | Error boundaries catch and display graceful fallback UI for component failures | react-error-boundary 6.1.1 API documented; native class component pattern documented as alternative; fallback prop interface confirmed |
| QUAL-03 | Route-level code splitting reduces initial bundle size | React.lazy + Suspense pattern at route level in App.jsx documented; loading fallback pattern identified |
| QUAL-04 | QR code generation verified to scan reliably across major devices and camera apps | jsQR decode approach confirmed; qrcode.toBuffer() confirmed available in Node environment; test pattern documented |
</phase_requirements>

---

## Summary

Phase 3 adds automated test coverage, graceful error handling, lazy-loaded landlord bundles, and QR reliability verification to a brownfield Vite+React app backed by Supabase. The project has zero unit test infrastructure today — no Vitest, no test directory, no setup files. Playwright E2E is present but the single existing test last failed. This phase wires up Vitest 4.x alongside Playwright (both coexist without conflict) and adds `src/__tests__/` as the unit test home.

The four test targets (LandlordGuard, AuditLogger, getSlaDeadline, transitionInvoiceStatus) span two concerns: pure logic functions that are trivially testable and two React-integrated modules that need jsdom and React Testing Library. The Supabase client is a module-level singleton at `src/services/supabaseClient.js` — it must be mocked via `vi.mock('@/services/supabaseClient')` in every test file that exercises code importing from it. The `@/` alias must be replicated in the Vitest config `resolve.alias`.

For error boundaries, `react-error-boundary` 6.1.1 is the correct choice over a hand-rolled class component. It provides a clean functional API with `FallbackComponent` prop, `resetErrorBoundary`, and `onError` callback while internally handling the class component requirement. For QR verification, `jsqr` is the correct decode library — it is a pure JS standalone with no browser dependency requirements, accepts `Uint8ClampedArray` RGBA data, and pairs with `qrcode.toBuffer()` (confirmed to exist in the installed `qrcode` 1.5.4 package) to create a round-trip encode/decode test entirely in Node.js.

**Primary recommendation:** Scaffold Vitest config first (Wave 1), then implement tests for pure logic functions before React component tests, then add error boundaries, then code splitting — each change is independently deployable and testable.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.1.2 | Unit/integration test runner | Native Vite integration; same `vite.config.js` module resolution; no transform config duplication |
| @testing-library/react | 16.3.2 | React component rendering in tests | Industry standard for behavior-driven component tests |
| @testing-library/jest-dom | 6.9.1 | DOM assertion matchers (`toBeInTheDocument`, `toHaveTextContent`) | Extends Vitest `expect` with readable DOM assertions |
| @testing-library/user-event | 14.6.1 | Simulates user interactions (click, type, etc.) | Preferred over `fireEvent` for realistic event dispatch |
| jsdom | 29.0.1 | DOM environment for tests | Vitest's `environment: 'jsdom'` uses this internally |
| react-error-boundary | 6.1.1 | Error boundary component with functional API | Avoids hand-rolling class components; clean `FallbackComponent` + `onError` API; v6.1.1 released Feb 2026 |
| jsqr | 1.4.0 | QR code decode for automated verification | Pure JS, no platform-specific code, runs in Node.js with `Uint8ClampedArray` RGBA input |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vitest/coverage-v8 | 4.1.2 | Coverage reporting via V8 | When coverage thresholds are desired; optional for this phase |

**Installation:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom react-error-boundary jsqr
```

Note: `jsdom` does not need to be installed directly — Vitest bundles it when `environment: 'jsdom'` is set. However installing it explicitly pins the version.

**Version verification (confirmed against npm registry 2026-04-03):**
- vitest: 4.1.2 (latest)
- @testing-library/react: 16.3.2 (latest)
- @testing-library/jest-dom: 6.9.1 (latest)
- @testing-library/user-event: 14.6.1 (latest)
- react-error-boundary: 6.1.1 (latest, released 2026-02-13)
- jsqr: 1.4.0 (latest)

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── __tests__/                    # All unit/integration tests (D-04)
│   ├── sla.test.js               # Pure logic: getSlaDeadline, SLA_DAYS
│   ├── accounting.test.js        # Pure logic: ALLOWED_TRANSITIONS, transitionInvoiceStatus
│   ├── AuditLogger.test.js       # Supabase-mocked: writeAudit shape
│   ├── LandlordGuard.test.jsx    # RTL: redirect behavior, loading state
│   └── qr.test.js                # jsqr round-trip: encode → decode → verify URL
├── components/
│   ├── ErrorBoundary.jsx         # Reusable error boundary (D-07)
│   └── guards/
│       └── LandlordGuard.jsx     # Existing (no changes)
└── test/
    └── setup.js                  # @testing-library/jest-dom import
vitest.config.js                  # Separate from vite.config.js (avoids polluting prod config)
```

### Pattern 1: Vitest Configuration
**What:** Separate `vitest.config.js` file extending Vite's alias configuration.
**When to use:** Always — keeps test config isolated from production Vite config.
**Example:**
```javascript
// vitest.config.js
// Source: https://vitest.dev/config/
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

### Pattern 2: Setup File for @testing-library/jest-dom
**What:** Import jest-dom matchers once in the setup file so all test files get them automatically.
```javascript
// src/test/setup.js
import '@testing-library/jest-dom';
```

### Pattern 3: Mocking the Supabase Singleton
**What:** `vi.mock` hoisting ensures the mock is in place before any module that imports the singleton resolves.
**When to use:** In every test file that exercises AuditLogger, AuthContext, or transitionInvoiceStatus.
**Example:**
```javascript
// Source: Vitest docs — https://vitest.dev/guide/mocking
import { vi } from 'vitest';

// Mock must use the SAME path the module uses (alias form)
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: '123', status: 'draft' }, error: null }),
      update: vi.fn().mockReturnThis(),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    }
  }
}));
```

**Critical:** The `vi.mock` path must exactly match what the source file imports. `AuditLogger.js` imports from `@/services/supabaseClient`, so the mock path must be `'@/services/supabaseClient'` (not a relative path). The `@/` alias in `vitest.config.js` enables this.

### Pattern 4: Testing Pure Logic (getSlaDeadline)
**What:** No mocks needed for pure functions. Import and assert directly.
```javascript
// src/__tests__/sla.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSlaDeadline, SLA_DAYS } from '@/lib/sla';

describe('getSlaDeadline', () => {
  beforeEach(() => {
    // Pin "now" to a known date so assertions are deterministic
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('returns deadline 1 day out for high priority', () => {
    const deadline = getSlaDeadline('high');
    expect(deadline).toBe('2026-01-02T00:00:00.000Z');
  });

  it('returns deadline 3 days out for unknown priority (fallback)', () => {
    const deadline = getSlaDeadline('unknown_priority');
    expect(deadline).toBe('2026-01-04T00:00:00.000Z');
  });
});
```

### Pattern 5: Testing ALLOWED_TRANSITIONS and transitionInvoiceStatus
**What:** Assert state machine rules directly; mock Supabase for the async path.
```javascript
// src/__tests__/accounting.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/supabaseClient', () => ({
  supabase: { from: vi.fn() }
}));
vi.mock('@/lib/AuditLogger', () => ({
  writeAudit: vi.fn().mockResolvedValue({})
}));

import { ALLOWED_TRANSITIONS, transitionInvoiceStatus } from '@/services/accounting';
import { supabase } from '@/services/supabaseClient';

describe('ALLOWED_TRANSITIONS', () => {
  it('allows draft → sent', () => {
    expect(ALLOWED_TRANSITIONS.draft).toContain('sent');
  });
  it('forbids paid → draft', () => {
    expect(ALLOWED_TRANSITIONS.paid).toHaveLength(0);
  });
});

describe('transitionInvoiceStatus', () => {
  it('throws on invalid transition', async () => {
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: '1', status: 'paid' }, error: null }),
    });
    await expect(
      transitionInvoiceStatus('1', 'draft', { userId: 'u1', userEmail: 'a@b.com' })
    ).rejects.toThrow('Invalid transition: paid → draft');
  });
});
```

### Pattern 6: Testing LandlordGuard with RTL
**What:** Render the component within MemoryRouter and a mock AuthProvider; assert navigation behavior.
```javascript
// src/__tests__/LandlordGuard.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LandlordGuard from '@/components/guards/LandlordGuard';
import { AuthContext } from '@/lib/AuthContext';

vi.mock('@/services/supabaseClient', () => ({
  supabase: { auth: { onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }), getSession: vi.fn() } }
}));

const renderWithAuth = (authValue) =>
  render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={['/LandlordDashboard']}>
        <Routes>
          <Route element={<LandlordGuard />}>
            <Route path="/LandlordDashboard" element={<div>Protected Content</div>} />
          </Route>
          <Route path="/LandlordLogin" element={<div>Login Page</div>} />
          <Route path="/Welcome" element={<div>Welcome Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );

it('redirects non-landlord to /Welcome', () => {
  renderWithAuth({ user: { id: '1' }, isLoadingAuth: false, isLandlord: false });
  expect(screen.getByText('Welcome Page')).toBeInTheDocument();
});
```

**Note:** `AuthContext` must be exported as a named export from `AuthContext.jsx`. Currently it is only used internally. Either export it, or test `LandlordGuard` by mounting through a custom `AuthProvider` wrapper that accepts a mock session via `vi.mock`.

### Pattern 7: QR Code Round-Trip Test with jsqr
**What:** Generate a QR buffer in Node.js using `qrcode.toBuffer()`, decode with `jsqr`, assert the URL matches.
```javascript
// src/__tests__/qr.test.js
import { describe, it, expect } from 'vitest';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { PNG } from 'pngjs'; // OR use jimp — see Pitfalls section

describe('QR code generation', () => {
  it('encodes business profile URL and decodes correctly', async () => {
    const expectedUrl = 'http://localhost:5173/Profile?id=test-business-id';
    const pngBuffer = await QRCode.toBuffer(expectedUrl, { type: 'png' });

    const png = PNG.sync.read(pngBuffer);
    const imageData = new Uint8ClampedArray(png.data);
    const result = jsQR(imageData, png.width, png.height);

    expect(result).not.toBeNull();
    expect(result.data).toBe(expectedUrl);
  });
});
```

**Dependency note:** `pngjs` is needed to decode the PNG buffer into RGBA pixels for jsqr. Install: `npm install -D pngjs`. Alternatively `jimp` works but is heavier (bundles image processing). Confirm `pngjs` is not already in the dependency tree.

### Pattern 8: react-error-boundary Usage (Reusable ErrorBoundary)
**What:** Wrap `react-error-boundary`'s `ErrorBoundary` in a project-specific component exposing `variant` prop.
```jsx
// src/components/ErrorBoundary.jsx
// Source: https://github.com/bvaughn/react-error-boundary (v6.1.1)
import { ErrorBoundary as REB } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

function PageFallback({ error, resetErrorBoundary }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-brand-navy">
      <Card className="p-8 text-center max-w-md bg-brand-navy/50 border-white/10">
        <h2 className="text-xl font-bold text-white">Something went wrong</h2>
        <p className="text-zinc-400 mt-2 text-sm">{error?.message}</p>
        <Button onClick={resetErrorBoundary} className="mt-6">
          Reload page
        </Button>
      </Card>
    </div>
  );
}

function SectionFallback({ error, resetErrorBoundary }) {
  return (
    <Card className="p-4 border-red-900/20 bg-red-950/10">
      <p className="text-sm text-zinc-400">This section could not load.</p>
      <Button size="sm" variant="outline" onClick={resetErrorBoundary} className="mt-2">
        Retry
      </Button>
    </Card>
  );
}

const FALLBACK_COMPONENTS = {
  page: PageFallback,
  section: SectionFallback,
};

export default function ErrorBoundary({ children, variant = 'page', onError }) {
  const FallbackComponent = FALLBACK_COMPONENTS[variant];
  return (
    <REB FallbackComponent={FallbackComponent} onError={onError}>
      {children}
    </REB>
  );
}
```

### Pattern 9: React.lazy + Suspense in App.jsx
**What:** Dynamically import landlord page modules; show branded spinner while chunks load.
```jsx
// In App.jsx — replace static imports for the 4 landlord pages
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const LandlordDashboard = lazy(() => import('./pages/LandlordDashboard'));
const LandlordRequests  = lazy(() => import('./pages/LandlordRequests'));
const Accounting        = lazy(() => import('./pages/Accounting'));
const AuditPage         = lazy(() => import('./pages/AuditPage'));

const LandlordLoadingFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-brand-navy">
    <Loader2 className="w-8 h-8 animate-spin text-brand-slate-light" />
  </div>
);

// Wrap the landlord <Route> group's outlet in Suspense:
<Route element={
  <Suspense fallback={<LandlordLoadingFallback />}>
    <LandlordGuard />
  </Suspense>
}>
```

**Alternative placement:** Wrap each individual landlord Route `element` in its own `<Suspense>` instead of wrapping `<LandlordGuard>`. Either works; wrapping the guard outlet is more concise and avoids duplicating the fallback.

**Note on pages.config.js:** The auto-generated `pages.config.js` provides `Pages` as a record of static imports. The lazy landlord pages must be defined as separate `const` declarations in `App.jsx` and referenced by name in the `LANDLORD_PAGES` route map — they cannot be lazy-imported through `pagesConfig.Pages`. The `Pages` object from `pages.config.js` will continue to serve tenant pages.

### Anti-Patterns to Avoid
- **Mocking via relative path when source uses alias:** If `AuditLogger.js` imports `from '@/services/supabaseClient'`, the mock must be `vi.mock('@/services/supabaseClient', ...)` — using `vi.mock('../../services/supabaseClient')` will create a separate mock that the source file never sees.
- **Testing Supabase CRUD wrappers:** D-01 explicitly excludes this. The factory functions in `createAccountingService` are thin passthroughs — testing them requires complex chain mocks for little value.
- **Placing error boundaries inside page components:** Boundaries must wrap pages from outside (in App.jsx or a layout) so a crash inside the page is caught. A boundary inside the crashing component will not catch its own render error.
- **Using `React.lazy` for tenant pages:** D-10 locks this to landlord-only pages. Tenant pages stay eager-loaded for fast initial paint.
- **Importing `window.location.origin` in test context:** `BusinessQRCode.jsx` uses `window.location.origin` to construct the QR URL. In the QR test, the URL is constructed manually and passed directly to `QRCode.toBuffer()` — no need to mount the component.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error boundary class component | Custom `class ErrorBoundary extends Component` | `react-error-boundary` 6.1.1 | Class components require `getDerivedStateFromError` + `componentDidCatch` correctly; library handles edge cases including reset key propagation |
| QR image decoding | Canvas-based pixel extraction in jsdom | `qrcode.toBuffer()` + `jsqr` | jsdom canvas is partial; `toBuffer()` works in Node directly; jsqr accepts the PNG pixels from `pngjs` without DOM |
| Supabase response chain mock builder | Custom mock factory object | Direct `vi.fn()` chains per test | The chain mock is simple enough inline; a factory adds abstraction overhead for 4 test files |

**Key insight:** The only truly complex implementation in this phase is the QR test pipeline (encode → PNG buffer → RGBA pixels → jsqr decode). Everything else uses straightforward Vitest patterns.

---

## Common Pitfalls

### Pitfall 1: AuthContext Not Exported
**What goes wrong:** `LandlordGuard.test.jsx` needs to provide a mock `AuthContext` value. `AuthContext` is created in `AuthContext.jsx` but is never exported — only `AuthProvider` and `useAuth` are exported.
**Why it happens:** The context object is treated as an internal implementation detail.
**How to avoid:** Either (a) add `export { AuthContext }` to `AuthContext.jsx` so tests can use `<AuthContext.Provider value={mockValue}>`, or (b) mock the entire `useAuth` hook with `vi.mock('@/lib/AuthContext', () => ({ useAuth: vi.fn() }))` and call `useAuth.mockReturnValue(mockAuthValue)` per test. Option (b) is safer — no source changes needed.
**Warning signs:** TypeScript error "AuthContext is not exported" or test failing because the guard always reads from the real context.

### Pitfall 2: Supabase Chained Method Mock Scope
**What goes wrong:** `transitionInvoiceStatus` calls `supabase.from('invoices')` twice (once for SELECT, once for UPDATE). If the mock returns the same mock object for `.from()`, the second call overrides the first's `mockResolvedValue`.
**Why it happens:** The builder chain pattern means each `.from()` call must return a fresh chain object.
**How to avoid:** Use `mockReturnValueOnce` for the first call, `mockReturnValue` for the second. Or return a new mock object from each `vi.fn()` call.
**Warning signs:** Tests that only mock one DB call silently return `undefined` for the second call.

### Pitfall 3: vi.mock Hoisting With Path Aliases
**What goes wrong:** `vi.mock('@/services/supabaseClient', ...)` at the bottom of a test file does not mock correctly because `vi.mock` is hoisted but the alias resolution depends on Vitest config being loaded first.
**Why it happens:** `vi.mock` is hoisted to the top of the compiled test file, before config is applied.
**How to avoid:** Always put `vi.mock` calls at the top of the test file (even though they are technically hoisted, this makes the intent clear and avoids confusion with variable references). Ensure `vitest.config.js` has the `resolve.alias` for `@/`. Confirmed pattern: alias in `vitest.config.js` resolves correctly for `vi.mock` paths.
**Warning signs:** `Cannot find module '@/services/supabaseClient'` error in tests.

### Pitfall 4: pngjs Sync vs Async API
**What goes wrong:** `PNG.sync.read(buffer)` throws if the buffer is a raw PNG from `QRCode.toBuffer()` but `pngjs` expects the buffer to be fully parsed.
**Why it happens:** `pngjs` has both sync and async APIs; the sync version works with complete buffers but requires the buffer to be a valid PNG.
**How to avoid:** Use `QRCode.toBuffer(url, { type: 'png' })` which returns a Promise resolving to a complete PNG buffer. Then `PNG.sync.read(buffer)` will work. Confirm `type: 'png'` is specified — the default in Node may differ.
**Warning signs:** `CrcError` or `Error: PNG signature not found`.

### Pitfall 5: Error Boundaries Do Not Catch Async Errors
**What goes wrong:** A component throws in a `useEffect` or a promise rejection — the error boundary does not catch it.
**Why it happens:** Error boundaries only catch errors thrown during React render and lifecycle methods. Async errors escape the boundary.
**How to avoid:** Do not add error boundaries expecting them to catch network failures. React Query's `isError` state handles failed API calls. Error boundaries are for render crashes only.
**Warning signs:** Error boundary fallback never appears for known async failure scenarios.

### Pitfall 6: Lazy Import Path Must Match pagesConfig
**What goes wrong:** `pages.config.js` imports page components eagerly (auto-generated). If `App.jsx` also references lazy versions, there may be two module instances loaded.
**Why it happens:** Auto-generated `pagesConfig.Pages` already imports the landlord pages. If `App.jsx` bypasses `pagesConfig.Pages` for landlord pages and uses `React.lazy()` instead, but `pagesConfig.Pages` still imports them eagerly, the bundle benefit is reduced.
**How to avoid:** The landlord pages (`LandlordDashboard`, `LandlordRequests`, `Accounting`, `AuditPage`) must be removed from the `Pages` object used in `App.jsx` — they should only be referenced via `React.lazy()`. Since `pagesConfig.js` is auto-generated and includes all pages, review whether the `LANDLORD_PAGES` filter in `App.jsx` already prevents them from being routed through `pagesConfig.Pages`. Looking at the current `App.jsx`: the landlord pages are imported via `pagesConfig.Pages` (`const Page = Pages[name]`) inside the `<Route element={<LandlordGuard />}>` block. To enable true code splitting, these must be changed to the `React.lazy()` declarations instead of pulling from `Pages`.
**Warning signs:** Bundle analyzer shows landlord page modules in the main chunk despite `React.lazy()` being present.

---

## Code Examples

Verified patterns from official sources and confirmed against installed library versions:

### Vitest Config (complete)
```javascript
// vitest.config.js
// Source: https://vitest.dev/config/
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

### Test setup file
```javascript
// src/test/setup.js
import '@testing-library/jest-dom';
```

### package.json test scripts
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "npx playwright test",
    "test:e2e:headed": "npx playwright test --headed",
    "test:e2e:report": "npx playwright show-report"
  }
}
```

### AuditLogger test (confirming insert shape)
```javascript
// src/__tests__/AuditLogger.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    from: vi.fn()
  }
}));

import { writeAudit } from '@/lib/AuditLogger';
import { supabase } from '@/services/supabaseClient';

describe('writeAudit', () => {
  let mockInsert;

  beforeEach(() => {
    mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    supabase.from.mockReturnValue({ insert: mockInsert });
  });

  it('calls supabase.from("audit_log").insert() with correct shape', async () => {
    await writeAudit({
      entityType: 'invoice',
      entityId: 'inv-1',
      action: 'status_changed',
      oldValue: { status: 'draft' },
      newValue: { status: 'sent' },
      userId: 'user-1',
      userEmail: 'a@b.com',
    });

    expect(supabase.from).toHaveBeenCalledWith('audit_log');
    expect(mockInsert).toHaveBeenCalledWith({
      entity_type: 'invoice',
      entity_id: 'inv-1',
      action: 'status_changed',
      old_value: { status: 'draft' },
      new_value: { status: 'sent' },
      performed_by_user_id: 'user-1',
      performed_by_email: 'a@b.com',
    });
  });
});
```

### QR round-trip test
```javascript
// src/__tests__/qr.test.js
import { describe, it, expect } from 'vitest';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';

describe('QR code round-trip', () => {
  it('encodes a URL and jsqr decodes it back correctly', async () => {
    const url = 'http://localhost:5173/Profile?id=abc-123';
    const pngBuffer = await QRCode.toBuffer(url, { type: 'png' });
    const png = PNG.sync.read(pngBuffer);
    const result = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(result).not.toBeNull();
    expect(result.data).toBe(url);
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest + Babel transform | Vitest (native ESM, Vite transform) | 2022+ | No Babel config needed; same module resolution as production build |
| Class-based error boundary | `react-error-boundary` functional wrapper | 2021+ | No class components in otherwise functional codebase |
| Bundle everything eagerly | `React.lazy()` + dynamic import | React 16.6 (2018) | Reduces initial parse/execute cost for code paths users may never visit |
| Manual QR visual inspection | Automated jsqr round-trip test | N/A — new pattern | Catches encoding regressions in CI before they reach users |

**Deprecated/outdated:**
- `@testing-library/react` v12: Required `wrap act()` everywhere. v16+ (React 18) handles act wrapping automatically.
- `React.lazy` with class components: Lazy loading requires default exports. All page components in this project already use default exports — no changes needed.

---

## Open Questions

1. **`pngjs` availability**
   - What we know: `pngjs` is not in the current `package.json`. It needs to be installed as a dev dependency for the QR round-trip test.
   - What's unclear: Whether any existing dependency transitively provides `pngjs` (possible — it is a common dependency).
   - Recommendation: Run `npm ls pngjs` before installing. If not found, add `npm install -D pngjs`.

2. **`AuthContext` export for testing**
   - What we know: `AuthContext` is not exported from `AuthContext.jsx`. LandlordGuard tests need to provide mock context values.
   - What's unclear: Whether mocking `useAuth` directly (via `vi.mock('@/lib/AuthContext', ...)`) is preferable to adding an export.
   - Recommendation: Mock `useAuth` with `vi.mock` — no source file changes needed, and it tests the contract (the hook return value) rather than the implementation detail (the context object).

3. **pages.config.js and lazy loading interaction**
   - What we know: `pages.config.js` is auto-generated and imports all pages including landlord pages. `App.jsx` filters landlord pages via the `LANDLORD_PAGES` array but still accesses them through `pagesConfig.Pages`.
   - What's unclear: Whether Vite's module graph treats the `Pages[name]` reference as a static import that will prevent code splitting, or if the `React.lazy()` wrapper overrides that.
   - Recommendation: Declare the 4 lazy imports explicitly in `App.jsx` and use those in the landlord routes rather than `Pages[name]`. This is the only guaranteed way to ensure Vite splits those modules into separate chunks.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vitest runner | Yes | v25.6.0 | — |
| npm | Package install | Yes | (from Node.js install) | — |
| qrcode | QR round-trip test | Yes (production dep) | 1.5.4 | — |
| jsqr | QR decode in tests | No (needs install) | 1.4.0 available | — |
| pngjs | PNG buffer decode for jsqr | No (needs install) | check `npm ls pngjs` | jimp (heavier) |
| vitest | Unit tests | No (needs install) | 4.1.2 available | — |
| @testing-library/react | Component tests | No (needs install) | 16.3.2 available | — |
| react-error-boundary | Error boundaries | No (needs install) | 6.1.1 available | hand-roll class component |
| Playwright | E2E tests | Yes (devDep) | 1.58.2 | — |

**Missing dependencies with no fallback:**
- `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsqr` — all need installation before tests can run.

**Missing dependencies with fallback:**
- `pngjs` — verify with `npm ls pngjs` first; fallback is `jimp` if absent.
- `react-error-boundary` — could hand-roll a class component if absolutely needed, but the library is the recommended path.

---

## Project Constraints (from CLAUDE.md)

The following directives from CLAUDE.md constrain planning decisions:

- **Tech stack locked:** Supabase for BaaS — no custom backend. Tests must mock Supabase, not replace it.
- **Brownfield project:** Must preserve existing functionality. Error boundaries and code splitting are additive only — no removing or restructuring existing page logic.
- **Import alias:** All imports use `@/` prefix (maps to `./src/`). Vitest config must replicate `resolve.alias`. All test imports must use `@/`.
- **No try-catch in React components/service layer:** `AuthContext.jsx` contains `try-catch` in `checkAppState()` — this is noted in STATE.md as correct for Deno Edge Functions context. For new test code in this phase, `try-catch` in tests is fine (tests are not production code). Do not add `try-catch` to service layer test helpers.
- **ESLint: unused-imports/no-unused-imports is error-level:** All imports in test files must be used. Do not leave unused `vi` or `expect` imports.
- **Default exports for components:** `ErrorBoundary.jsx` must use `export default`. Named export of the react-error-boundary `ErrorBoundary` must be aliased on import to avoid collision.
- **File naming:** Component test files use PascalCase (`LandlordGuard.test.jsx`). Pure logic test files use camelCase matching the source (`sla.test.js`, `accounting.test.js`).
- **GSD workflow enforcement:** Do not make direct repo edits outside a GSD workflow. All implementation goes through `/gsd:execute-phase`.

---

## Sources

### Primary (HIGH confidence)
- Vitest official docs (https://vitest.dev/config/, https://vitest.dev/guide/mocking) — config options, mocking API
- react-error-boundary GitHub (https://github.com/bvaughn/react-error-boundary) — v6.1.1 API, FallbackComponent interface
- jsQR GitHub (https://github.com/cozmo/jsQR) — standalone Node.js usage, Uint8ClampedArray input format
- npm registry (confirmed live 2026-04-03) — all version numbers

### Secondary (MEDIUM confidence)
- WebSearch: Vitest + Supabase mocking patterns (multiple community sources agree on vi.mock singleton approach)
- WebSearch: react-error-boundary vs class component (official React docs + community confirm library preference)

### Tertiary (LOW confidence)
- jsqr + jimp combination for Node.js QR decoding — community DEV.to article; verified against jsqr README but full test not run
- pngjs as lighter alternative to jimp for PNG decoding — inferred from jsqr README examples; needs validation at install time

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry 2026-04-03
- Architecture: HIGH — patterns verified against official Vitest and react-error-boundary docs
- Pitfalls: HIGH for alias/mock pitfalls (Vitest docs + known patterns); MEDIUM for pngjs sync API details (confirmed in principle, not run locally)
- QR decode pipeline: MEDIUM — qrcode.toBuffer() confirmed via Node.js REPL inspection; jsqr+pngjs pattern confirmed via README but full end-to-end not executed

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable libraries; vitest moves fast but 4.x is stable)
