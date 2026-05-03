---
status: resolved
trigger: "unit-mvp-critical-high-bugs: 9 confirmed bugs (4 CRITICAL, 5 HIGH) across auth, push notifications, storage, and edge functions"
created: 2026-04-10T00:00:00Z
updated: 2026-04-10T00:01:00Z
---

## Current Focus

hypothesis: All 8 fixes applied and verified by file read
test: Final read of all 5 changed files
expecting: All edits present and correct
next_action: Complete

## Symptoms

expected: App loads reliably, auth state is stable, push tokens register, file uploads validate, onboarding completes safely
actual: Multiple confirmed root causes — all pre-investigated. See bug list.
errors: Auth hangs, silent DB errors, redirect loops, push silently fails, null crashes, error page uploads, property_ids overwritten, JSON parse crashes
reproduction: Confirmed by direct file reading — no reproduction needed
started: Exists since M1/M2 implementation

## Eliminated

(none — all bugs confirmed, went straight to fixes)

## Evidence

- timestamp: 2026-04-10T00:00:00Z
  checked: Bug list provided by orchestrator
  found: 8 bugs confirmed across 5 files
  implication: Apply fixes in order BUG-01 through BUG-09

- timestamp: 2026-04-10T00:01:00Z
  checked: lib/AuthContext.tsx — BUG-01 + BUG-02
  found: try/catch/finally added to initAuth and onAuthStateChange; error destructured and thrown in fetchProfile
  implication: BUG-01 and BUG-02 fixed

- timestamp: 2026-04-10T00:01:00Z
  checked: app/_layout.tsx — BUG-04
  found: Added !segments.includes('reset-password') guard to needsPasswordChange redirect condition
  implication: BUG-04 redirect loop fixed

- timestamp: 2026-04-10T00:01:00Z
  checked: hooks/usePushNotifications.ts — BUG-05
  found: Removed dummy UUID fallback; added early return with clear warning when projectId is absent
  implication: BUG-05 silent push failure fixed

- timestamp: 2026-04-10T00:01:00Z
  checked: app/(auth)/onboarding.tsx — BUG-06
  found: Added optional chaining on p.address?.toLowerCase() and p.city?.toLowerCase()
  implication: BUG-06 null crash fixed

- timestamp: 2026-04-10T00:01:00Z
  checked: services/storage.ts — BUG-07
  found: Added if (!response.ok) throw after fetch(uri)
  implication: BUG-07 error-page-as-image upload fixed

- timestamp: 2026-04-10T00:01:00Z
  checked: supabase/functions/complete-onboarding/index.ts — BUG-08 + BUG-09
  found: Wrapped req.json() in try/catch returning 400; fetch-merge-update pattern replaces overwrite
  implication: BUG-08 and BUG-09 fixed

## Resolution

root_cause: |
  BUG-01: initAuth/onAuthStateChange had no try/catch/finally — any throw left isLoading=true forever
  BUG-02: fetchProfile destructured only data, not error — DB errors silently produced null profile
  BUG-04: needsPasswordChange redirect fired even when already on reset-password → loop
  BUG-05: Missing projectId fell back to dummy UUID that Expo push service rejects → silent failure
  BUG-06: p.address/city/state are nullable — .toLowerCase() on null throws TypeError
  BUG-07: No response.ok check after fetch(uri) — 4xx/5xx body uploaded as image data
  BUG-08: property_ids: [property_id] replaces entire array instead of appending
  BUG-09: req.json() had no try/catch — invalid JSON body produced unhandled 500

fix: |
  BUG-01: try/catch/finally wrapping in initAuth and onAuthStateChange callback; setIsLoading(false) moved to finally
  BUG-02: Destructure error from supabase query; throw if error is truthy
  BUG-04: Added !segments.includes('reset-password') to the needsPasswordChange branch condition
  BUG-05: Guard with early return null when projectId is undefined; pass projectId directly (no fallback)
  BUG-06: p.address?.toLowerCase() and p.city?.toLowerCase() (optional chaining)
  BUG-07: if (!response.ok) throw new Error(...) immediately after fetch(uri)
  BUG-08: Fetch existing property_ids, merge with Set, update with merged array
  BUG-09: try/catch around req.json() returning 400 with 'Invalid JSON body'

verification: All 5 files re-read after edits — changes confirmed present and correct

files_changed:
  - lib/AuthContext.tsx
  - app/_layout.tsx
  - hooks/usePushNotifications.ts
  - app/(auth)/onboarding.tsx
  - services/storage.ts
  - supabase/functions/complete-onboarding/index.ts
