---
phase: 03-quality-reliability
plan: 01
subsystem: testing
tags: [vitest, jsdom, react-testing-library, qrcode, jsqr, pngjs, supabase-mock]

# Dependency graph
requires:
  - phase: 02-financial-operations-workflows
    provides: "SLA deadline calculation (sla.js), invoice state machine (accounting.js), writeAudit function (AuditLogger.js)"
  - phase: 01-security-access-control
    provides: "AuditLogger infrastructure and audit_log table"
provides:
  - Vitest test runner configured with jsdom, @/ alias resolution, and jest-dom matchers
  - 18 unit tests across 4 files covering business-critical pure logic
  - Zero-network-call test suite with full Supabase mocking via vi.mock
affects: [03-quality-reliability, ci, future-phases]

# Tech tracking
tech-stack:
  added: [vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom, jsqr, pngjs]
  patterns:
    - vi.mock('@/services/supabaseClient') at top-of-file for Supabase isolation
    - vi.useFakeTimers() + vi.setSystemTime() for deterministic date testing
    - mockReturnValueOnce() chains for multi-call Supabase query sequences

key-files:
  created:
    - vitest.config.js
    - src/test/setup.js
    - src/__tests__/sla.test.js
    - src/__tests__/accounting.test.js
    - src/__tests__/AuditLogger.test.js
    - src/__tests__/qr.test.js
  modified: []

key-decisions:
  - "Vitest include pattern restricted to src/__tests__/**/*.test.* to prevent Playwright spec files in tests/ from being picked up by Vitest"
  - "QR test uses PNG.sync.read() with try/catch fallback to async parser for robustness"
  - "AuditLogger mock placed at module level (vi.mock hoisting) so accounting.js imports the mock, not the real Supabase client"

patterns-established:
  - "Test isolation pattern: vi.mock('@/services/supabaseClient', ...) always at top of file before other imports"
  - "Supabase chain mock: mockReturnValueOnce for ordered SELECT+UPDATE sequences in state machine tests"

requirements-completed: [QUAL-01, QUAL-04]

# Metrics
duration: 15min
completed: 2026-04-03
---

# Phase 03 Plan 01: Vitest Test Infrastructure and Unit Tests Summary

**Vitest configured with jsdom+@/ alias; 18 unit tests covering SLA deadlines, invoice state machine, audit log insert shape, and QR encode/decode round-trip — all without network calls**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-03T14:08:00Z
- **Completed:** 2026-04-03T14:10:30Z
- **Tasks:** 2
- **Files modified:** 6 (2 infra + 4 test files)

## Accomplishments

- Vitest configured with jsdom environment, @/ alias, and jest-dom matchers; excludes Playwright specs from `tests/`
- 5 SLA tests using pinned system time verifying `getSlaDeadline` for all priorities and unknown fallback
- 7 accounting tests validating all ALLOWED_TRANSITIONS entries and both valid/invalid `transitionInvoiceStatus` paths
- 4 AuditLogger tests asserting snake_case column mapping and null defaults for optional fields
- 2 QR round-trip tests encoding URLs via `qrcode` and decoding via `jsqr+pngjs`, all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Install test dependencies and create Vitest configuration** - `d236939` (chore)
2. **Task 2: Write unit tests for SLA, invoice transitions, AuditLogger, and QR decode** - `a2223ae` (test)

## Files Created/Modified

- `vitest.config.js` - Vitest config with jsdom, @/ alias, jest-dom setup, and include/exclude patterns
- `src/test/setup.js` - Global test setup importing @testing-library/jest-dom matchers
- `src/__tests__/sla.test.js` - 5 tests for SLA_DAYS constants and getSlaDeadline with fake timers
- `src/__tests__/accounting.test.js` - 7 tests for ALLOWED_TRANSITIONS map and transitionInvoiceStatus state machine
- `src/__tests__/AuditLogger.test.js` - 4 tests for writeAudit column mapping and null defaults
- `src/__tests__/qr.test.js` - 2 QR encode/decode round-trip tests via qrcode+jsqr+pngjs

## Decisions Made

- Restricted Vitest `include` to `src/__tests__/**/*.test.*` to prevent the existing Playwright spec file at `tests/landlord-login.spec.js` from being picked up by Vitest (they use Playwright's `test.describe` which crashes under Vitest's test runner)
- Used `PNG.sync.read()` with try/catch fallback to async parser for QR decode robustness per plan guidance

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added include/exclude patterns to vitest.config.js**
- **Found during:** Task 1 verification
- **Issue:** Vitest picked up `tests/landlord-login.spec.js` (Playwright format), which threw "Playwright Test did not expect test.describe() to be called here" and caused the test run to fail with 1 failed suite
- **Fix:** Added `include: ['src/__tests__/**/*.test.{js,jsx,ts,tsx}']` and `exclude: ['tests/**', 'node_modules/**']` to vitest.config.js test configuration
- **Files modified:** vitest.config.js
- **Verification:** `npx vitest run` now exits cleanly with "No test files found" before any tests were written
- **Committed in:** d236939 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (blocking issue)
**Impact on plan:** The fix was necessary for the test runner to function at all. No scope creep — one config property addition.

## Issues Encountered

- Existing Playwright test file in `tests/` directory caused Vitest to crash on startup — resolved with include/exclude pattern (see Deviations)

## Known Stubs

None — all test files are complete and all 18 tests pass.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `npm test` runs 18 unit tests covering all critical pure-logic paths
- Test infrastructure ready for additional test files in subsequent plans
- No blockers for 03-02 (error boundaries plan)

---
*Phase: 03-quality-reliability*
*Completed: 2026-04-03*
