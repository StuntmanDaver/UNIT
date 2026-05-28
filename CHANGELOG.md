# UNIT Portal — Changelog

## 2026-05-27 — Production-QA release gate stabilization

### Fixed
- **Full seeded admin E2E** — The login helper now waits for the admin/dashboard redirect after clicking Sign In, avoiding a race where Playwright could assert the authenticated page before Supabase auth completed.

### Verified
- `npm run release:check` with guarded production-QA Stripe test mode.
- `npm run test:e2e -- --project=chromium --workers=1 --reporter=line` — 6 passed, 2 skipped.
- `npm run test:e2e:full -- --reporter=line` — 2 passed.
- `git diff --check`.
