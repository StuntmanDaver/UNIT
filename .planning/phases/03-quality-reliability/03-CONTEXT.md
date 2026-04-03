# Phase 3: Quality & Reliability - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Automated test suite covering critical business logic (LandlordGuard, AuditLogger, SLA calculation, invoice state transitions), graceful error handling via error boundaries, route-level code splitting for landlord pages, and QR code scan reliability verification. No new user-facing features — this phase hardens what Phases 1 and 2 built.

</domain>

<decisions>
## Implementation Decisions

### Test Coverage
- **D-01:** Test only critical business logic — LandlordGuard, AuditLogger, SLA deadline calculation (`getSlaDeadline`), and invoice state transitions (`transitionInvoiceStatus`, `ALLOWED_TRANSITIONS`). Service layer CRUD operations are thin Supabase wrappers and not worth unit testing.
- **D-02:** Full mocks for all tests. Mock the Supabase client completely — no test database, no network calls. Tests must run without hitting the live API (per success criteria).
- **D-03:** Use Vitest as the test framework. Native Vite integration, uses same `vite.config.js` resolution. Install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@testing-library/user-event`.
- **D-04:** Test file location: `src/__tests__/` directory. Naming: `{module}.test.js` for pure logic, `{Component}.test.jsx` for component tests.

### Error Boundaries
- **D-05:** Error boundaries at page-level AND critical sections. Every page route gets an error boundary. Additionally, targeted boundaries around accounting modals, request forms, and the audit timeline component.
- **D-06:** Fallback UI is a branded error card. Card with UNIT branding (brand-navy background for landlord pages, light for tenant), "Something went wrong" message, and a "Reload page" button. Must be consistent with existing brand patterns.
- **D-07:** Error boundary component is reusable — single `ErrorBoundary` component with a prop for fallback variant (page-level vs section-level).

### QR Code Verification
- **D-08:** Automated decode verification in the test suite. Generate QR codes programmatically, decode them, and verify the encoded content matches the expected business card URL. Catches encoding regressions in CI.
- **D-09:** Keep current QR code generation as-is. No style changes unless tests reveal scan failures. The `qrcode` library default output is standard-compliant.

### Code Splitting
- **D-10:** Lazy-load landlord routes only: Accounting, LandlordDashboard, LandlordRequests, AuditPage. Tenant routes stay in the main bundle for fast initial load since they're the most common entry point.
- **D-11:** Loading fallback is a branded spinner — centered Loader2 icon with brand-navy background. Matches existing loading patterns throughout the app.
- **D-12:** Use `React.lazy()` + `Suspense` at the route level in `App.jsx`. No changes to the page components themselves.

### Claude's Discretion
- Vitest configuration details (globals, setup files, coverage thresholds)
- Error boundary class component implementation vs using a library like `react-error-boundary`
- QR decode library choice for automated verification (e.g., `jsqr`, `qrcode-reader`)
- Which specific accounting modals and request forms get section-level error boundaries
- Suspense boundary placement (wrapping individual routes vs route groups)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Testing Infrastructure
- `.planning/codebase/TESTING.md` — Complete testing analysis: current state (1 Playwright E2E test, zero unit tests), recommended Vitest config, mock targets, gap analysis
- `tests/landlord-login.spec.js` — Existing E2E test pattern (Playwright + Supabase admin client)
- `playwright.config.js` — E2E configuration (do not modify — Phase 3 adds Vitest alongside)

### Critical Business Logic (test targets)
- `src/services/accounting.js` — `ALLOWED_TRANSITIONS` map + `transitionInvoiceStatus()` — primary test target for invoice lifecycle
- `src/lib/sla.js` — `SLA_DAYS` constants + `getSlaDeadline()` — pure function, easy to unit test
- `src/lib/AuditLogger.js` — `writeAudit()` function — verify it calls supabase.from('audit_log').insert() with correct shape
- `src/lib/AuthContext.jsx` — `useAuth` hook with `checkAppState()`, role detection, `isLandlord` — needs React Testing Library

### Error Boundary Targets
- `src/App.jsx` — Route definitions where page-level Suspense/ErrorBoundary wrappers go
- `src/pages/Accounting.jsx` — Largest page (693+ LOC), modal-heavy, needs section-level boundaries
- `src/pages/LandlordRequests.jsx` — Request forms + audit timeline need section-level boundaries

### QR Code
- `src/pages/MyCard.jsx` — QR code generation (439 LOC) — where the qrcode library is used

### Phase 1 & 2 Decisions (constraints)
- `.planning/phases/01-security-access-control/01-CONTEXT.md` — Auth patterns, LandlordGuard behavior
- `.planning/phases/02-financial-operations-workflows/02-CONTEXT.md` — Invoice lifecycle, SLA rules, audit trail patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Loader2` from lucide-react — already used for loading spinners throughout the app
- Brand gradient classes (`bg-gradient-to-br from-brand-navy via-brand-blue to-brand-navy`) — for error boundary fallback styling
- `src/components/ui/card.jsx` — Card primitive for error fallback UI
- `src/components/ui/button.jsx` — "Reload page" button in error fallback

### Established Patterns
- All loading states use `Loader2` spinner with brand colors
- Page components have consistent structure: header, main content area, loading guard
- `@/` import alias configured in both `jsconfig.json` and `vite.config.js` — Vitest config must replicate this

### Integration Points
- `src/App.jsx` — Route definitions: wrap with `React.lazy()` + `Suspense` for code splitting, add `ErrorBoundary` wrappers
- `package.json` — Add Vitest dev dependencies and `test` script
- `vite.config.js` or new `vitest.config.js` — Test configuration

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for all implementation details.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-quality-reliability*
*Context gathered: 2026-04-03*
