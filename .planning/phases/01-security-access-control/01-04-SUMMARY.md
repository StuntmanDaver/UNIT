---
phase: 01-security-access-control
plan: "04"
subsystem: auth-routing
tags: [property-switcher, property-context, audit-timeline, landlord-pages, tanstack-query]

dependency_graph:
  requires:
    - phase: 01-02
      provides: PropertyContext, LandlordGuard, App.jsx routing
    - phase: 01-03
      provides: AuditLogTimeline, AuditLogEntry, AuditPage
  provides:
    - PropertySwitcher header dropdown for multi-property landlords
    - Landlord pages consuming activePropertyId from PropertyContext
    - AuditPage added to LandlordGuard protected routes
    - Inline AuditLogTimeline in LandlordRequests request detail
    - Inline AuditLogTimeline in Accounting invoice detail
    - Zero sessionStorage auth references remaining in landlord pages
  affects: []

tech-stack:
  added: []
  patterns:
    - PropertyContext as single source of truth for activePropertyId across all landlord pages
    - Expandable detail rows with inline audit timeline (click to expand/collapse)
    - PropertySwitcher returns null for single-property landlords (D-09 conditional render)

key-files:
  created:
    - src/components/PropertySwitcher.jsx
  modified:
    - src/App.jsx
    - src/pages/LandlordDashboard.jsx
    - src/pages/LandlordRequests.jsx
    - src/pages/Accounting.jsx

key-decisions:
  - "Back navigation in LandlordRequests and Accounting no longer appends ?propertyId= since propertyId comes from PropertyContext"
  - "Invoice audit timeline uses selectedInvoiceId expand/collapse state rather than modal embedding — keeps audit visible without opening edit modal"
  - "Request audit timeline uses expandedRequestId toggle on row click — clicking the status dropdown is excluded from toggle via stopPropagation"

requirements-completed: [AUTH-02, AUTH-04, AUTH-05, AUTH-06]

duration: ~3min
completed: "2026-03-26"
---

# Phase 1 Plan 4: Property Switcher, PropertyContext Migration, and Inline Audit Timelines Summary

**PropertySwitcher header dropdown, all landlord pages migrated from sessionStorage/URLSearchParams to PropertyContext, AuditPage added to LandlordGuard, and inline AuditLogTimeline wired into request and invoice detail views.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-26T05:28:05Z
- **Completed:** 2026-03-26T05:31:01Z
- **Tasks:** 2 of 3 (Task 3 is human-verify checkpoint)
- **Files modified:** 5

## Accomplishments

- Created PropertySwitcher dropdown component querying properties table by landlord's propertyIds, hidden for single-property landlords (D-09), shows Loader2 spinner during switching, Check icon on active property
- Removed all sessionStorage auth guards from LandlordDashboard (the legacy `landlord_property_id` check useEffect is gone)
- All three landlord pages now consume `activePropertyId` from `useProperty()` hook instead of `URLSearchParams` or sessionStorage
- Added PropertySwitcher to LandlordDashboard header (positioned before notification bell)
- AuditPage added to LANDLORD_PAGES array in App.jsx — protected by LandlordGuard
- LandlordRequests: clicking a request row expands an inline AuditLogTimeline showing audit entries filtered by entity_type=recommendation and entity_id
- Accounting: clicking an invoice row expands an inline AuditLogTimeline showing audit entries filtered by entity_type=invoice and entity_id, with a separate Edit button to open the edit modal

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PropertySwitcher and add AuditPage to guarded routes** - `5a8235a` (feat)
2. **Task 2: Migrate landlord pages to PropertyContext, wire inline audit timelines** - `8d42127` (feat)
3. **Task 3: Human verification checkpoint** - awaiting human verification

## Files Created/Modified

- `src/components/PropertySwitcher.jsx` - Multi-property header dropdown; returns null for single-property landlords
- `src/App.jsx` - Added 'AuditPage' to LANDLORD_PAGES array
- `src/pages/LandlordDashboard.jsx` - Removed sessionStorage guard, replaced URLSearchParams with useProperty(), added PropertySwitcher to header, updated logout to use auth context
- `src/pages/LandlordRequests.jsx` - Replaced URLSearchParams with useProperty(), added expandedRequestId state, inline AuditLogTimeline per request
- `src/pages/Accounting.jsx` - Replaced URLSearchParams with useProperty(), added selectedInvoiceId state and invoice audit query, inline AuditLogTimeline in invoice detail expansion

## Decisions Made

- Back navigation in LandlordRequests and Accounting no longer appends `?propertyId=` to the URL since propertyId now comes from PropertyContext — keeps URLs clean
- Invoice audit timeline uses an expand/collapse row pattern rather than embedding inside InvoiceModal, so the audit trail is visible inline without triggering edit mode
- Request rows toggle the audit timeline on click, with `e.stopPropagation()` on the status Select to prevent accidental toggles when changing status

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. PropertySwitcher queries real data from the `properties` Supabase table. All audit timeline queries target real `audit_log` entries (empty state is a legitimate UI state, not a stub).

## Self-Check: PASSED

- `src/components/PropertySwitcher.jsx` exists ✓
- PropertySwitcher uses `useProperty` and `useAuth` ✓
- `src/App.jsx` contains 'AuditPage' in LANDLORD_PAGES ✓
- LandlordDashboard.jsx contains 0 sessionStorage references ✓
- All three landlord pages contain `useProperty` import and `const { activePropertyId: propertyId } = useProperty()` ✓
- LandlordRequests.jsx and Accounting.jsx render `<AuditLogTimeline>` ✓
- Commits `5a8235a` (Task 1) and `8d42127` (Task 2) exist in git history ✓
