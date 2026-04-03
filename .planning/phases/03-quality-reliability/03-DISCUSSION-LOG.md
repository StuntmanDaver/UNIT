# Phase 3: Quality & Reliability - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 03-quality-reliability
**Areas discussed:** Test coverage scope, Error boundary strategy, QR code verification, Code splitting approach

---

## Test Coverage Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Critical logic only | Test the 4 named targets + transitionInvoiceStatus. Service layer is thin wrappers. | ✓ |
| Critical logic + service layer | Also test service layer CRUD methods. Higher coverage but low value. | |
| Comprehensive | Add component tests for modals, forms, page integration tests. | |

**User's choice:** Critical logic only
**Notes:** Service layer is thin Supabase wrappers — mocking the client for CRUD tests adds bulk with low value.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Full mocks | Mock supabase client completely. No test database, no network. | ✓ |
| Test database | Use local Supabase instance. More realistic but heavier setup. | |
| You decide | Claude picks best approach. | |

**User's choice:** Full mocks
**Notes:** Matches success criteria requirement of "without hitting the live API."

---

## Error Boundary Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Page-level only | One boundary per route. Simple, covers 90% of cases. | |
| Page + critical sections | Page boundaries plus targeted around accounting modals, request forms, audit timeline. | ✓ |
| Global only | Single boundary at App root. Simplest but entire app replaced on any crash. | |

**User's choice:** Page + critical sections
**Notes:** More granular error handling for complex UI sections.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Branded error card | Card with UNIT branding, "Something went wrong", "Reload page" button. | ✓ |
| Minimal text | Simple text message with refresh instruction. | |
| You decide | Claude designs fallback based on existing patterns. | |

**User's choice:** Branded error card
**Notes:** Consistent with dark navy landlord layout and light tenant layout.

---

## QR Code Verification

| Option | Description | Selected |
|--------|-------------|----------|
| Manual test protocol | Checklist: generate QR, scan with 3 devices, record pass/fail. | |
| Automated visual regression | Generate QR in tests, decode programmatically, verify content. | ✓ |
| Both | Automated decode + manual device checklist. | |

**User's choice:** Automated visual regression
**Notes:** Catches encoding issues in CI. Does not test real camera scanning but verifies content correctness.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Keep as-is, verify works | Current qrcode library output is standard. If it scans, don't change. | ✓ |
| Add error correction level | Bump to 'H' (high) for better reliability with logos/damage. | |
| You decide | Claude picks based on testing results. | |

**User's choice:** Keep as-is, verify works
**Notes:** No style changes unless tests reveal issues.

---

## Code Splitting Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Landlord routes only | Lazy-load Accounting, LandlordDashboard, LandlordRequests, AuditPage. | ✓ |
| All routes | Lazy-load every page route. Maximum reduction but loading flicker. | |
| Heavy pages only | Lazy-load pages over ~200 LOC. | |

**User's choice:** Landlord routes only
**Notes:** Tenant routes stay in main bundle for fast initial load as most common entry point.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Branded spinner | Centered Loader2 with brand-navy background. Matches existing patterns. | ✓ |
| Skeleton screens | Page-specific skeleton layouts. Better perceived performance, more code. | |
| You decide | Claude picks based on existing loading patterns. | |

**User's choice:** Branded spinner
**Notes:** Consistent with existing loading patterns throughout the app.

---

## Claude's Discretion

- Vitest configuration details (globals, setup files, coverage thresholds)
- Error boundary implementation approach (class component vs react-error-boundary library)
- QR decode library choice for automated verification
- Which specific accounting modals get section-level boundaries
- Suspense boundary placement details

## Deferred Ideas

None — discussion stayed within phase scope.
