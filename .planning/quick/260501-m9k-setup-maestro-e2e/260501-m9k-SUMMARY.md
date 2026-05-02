---
quick_id: 260501-m9k
status: complete
date: 2026-05-01
commits: [ed5c5ad, 5a8be74, ed13141]
---

# Summary

## What was done
- Added `accessibilityLabel={label}` to Input component TextInput so Maestro can target inputs by their label text
- Added `testID="search-input"` to SearchBar TextInput
- Added `testID="admin-logout-btn"` to admin dashboard logout Pressable
- Created `unit/maestro/` with config.yaml, 3 subflows (login-admin, login-tenant1, logout), and 10 UAT flow files
- Added `test:e2e` and `maestro` npm scripts with JAVA_HOME=/opt/homebrew/opt/openjdk@21 pre-set

## How to run
From `unit/`:
```
npm run test:e2e                                                   # run all flows
npm run maestro test maestro/flows/m2-02-directory.yaml           # single flow
npm run maestro test maestro/flows/qa-04-full-sweep.yaml          # full sweep
```

## Known limitations
- `admin-01-02-csv-import.yaml`: file picker step is SEMI-AUTOMATED (native iOS Files sheet can't be driven by Maestro). CSV staging is still manual.
- `m1-05-onboarding.yaml`: property/unit tap uses `index: 0` (tap first item). Adjust if test data ordering changes. Also requires email confirmation to be disabled in Supabase auth settings for fully automated flow.
- `m2-06-admin-review.yaml`: requires at least 1 pending promotion in DB before running.
- `m2-01-profile-edit.yaml`: requires the tenant1 test account to already have a business profile with an Edit Profile button visible.
- All flows require Metro bundler running and dev build installed on simulator.

## Self-Check: PASSED
- ed5c5ad: Input.tsx, SearchBar.tsx, (admin)/index.tsx modified
- 5a8be74: maestro/ directory with 14 files created
- ed13141: package.json test:e2e and maestro scripts added
