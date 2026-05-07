# US-021 / US-022 — Simulator UAT Rollup

**Status:** Complete on this branch (`ralph/engagement-ui-enhancement`). Live UAT against booted iOS simulator was completed on 2026-05-05 after the post-UAT commits (`6839bc7`, `d2fbb17`, `dbd9cbb`) and follow-up simulator/Stripe fixes.

## Prerequisites

- iOS Simulator (Xcode 15+) booted with a **freshly rebuilt** dev binary of UNIT
  - **Critical:** rebuild the dev client. `expo-web-browser` was added during US-014; any pre-existing dev binary lacks the native `ExpoWebBrowser` module. The lazy-import fix in `pending-payment.tsx` shows a clear "Checkout unavailable" toast on Pay Now if the binary is stale, but the actual checkout cannot complete without a rebuild
  - `cd unit && eas build --profile development --platform ios --local` (slow; needs Apple signing)
  - OR `cd unit && npx expo run:ios` (fast; runs CocoaPods + Xcode locally; CLAUDE.md memory notes a prior pod-install hang on this project — if it stalls, kill and retry)
- Maestro CLI installed (`brew install maestro`)
- Dev Supabase project with all migrations applied (incl. `20260502000003_promotion_payment_attempts_price_tier.sql`)
- Edge Function deployed with **test-mode** Stripe key:
  - `npx supabase functions deploy create-promotion-checkout-session`
  - `npx supabase secrets set STRIPE_SECRET_KEY=<sk_test_...>`
- Portal webhook deployed on Vercel (or any HTTPS host) with
  `STRIPE_WEBHOOK_SECRET` matching the Stripe dashboard endpoint
- At least one **active** row in `promotion_price_tiers`
- `tenant1@unit-test.com / admin123` exists in the dev project (subflow uses these)

## Re-run checklist

### US-021: Maestro happy paths

- [x] `cd unit && maestro test maestro/flows/m5-01-home-feed.yaml` → all green
- [x] `cd unit && maestro test maestro/flows/m5-02-tenant-paid-promotion.yaml` → all green
  - Card field selectors are Stripe-controlled; if they have changed, update m5-02 selectors and append the diff to `unit/scripts/ralph/progress.txt`
- [x] `cd unit && maestro test maestro/flows/qa-04-full-sweep.yaml` → all green (this also re-runs m5-02 inline)
- [x] After the run, log into the dev Supabase dashboard and confirm:
  - `promotions` row created with `payment_status='paid' AND review_status='pending'`
  - `promotion_payment_attempts` row with `status='completed' AND price_tier_id IS NOT NULL`
  - `promotion_status_events` row with `to_review_status='pending'`
  - Admin push notification fired (or queued, if no push token registered)

### US-022: Final verification sweep

- [x] `cd unit && npx tsc --noEmit` exits 0 (already green at code-complete)
- [x] `cd unit && npm run brand-lint` exits 0 (already green at code-complete)
- [x] `cd unit && npm test` exits 0 (already green: 65/65 jest)
- [x] `cd unit && maestro test maestro/flows/qa-04-full-sweep.yaml` (covered above)
- [x] Spot-check on iOS simulator:
  - `(tabs)/home.tsx` — Home feed renders ≥1 activity card; "My Property" / "Nearby" toggle responsive
  - `(tabs)/directory.tsx` — unchanged from main, no visual regression
  - `(tabs)/promotions.tsx` — unchanged from main, no visual regression
  - `(tabs)/promotions/pending-payment.tsx` — tier picker visible, Pay Now disabled until tier selected, success state ("Awaiting Review" + CheckCircle icon) renders after paid
  - `(tabs)/community.tsx` — unchanged from main, no visual regression
  - `(tabs)/profile.tsx` — unchanged from main, no visual regression
- [ ] Optional: run `accesslint-contrast-checker` against every file changed in this PRD; expected zero failures (brand-lint already enforces palette pairing)

## What to do if a step fails

- Maestro flow fails before Stripe redirect: re-run with `--debug-output` and post the screenshots into `progress.txt`. Likely causes: dev Supabase missing seed data, dev Edge Function missing STRIPE_SECRET_KEY, or selectors drifted (`Choose a tier` text changed).
- Stripe redirect succeeds but the screen never flips to "Awaiting Review": webhook didn't fire. Verify portal `STRIPE_WEBHOOK_SECRET` matches the dashboard, and that the Stripe dashboard endpoint subscribes to `checkout.session.completed`.
- Visual regression on any existing tab: revert the offending commit on this branch BEFORE merging. The CLAUDE.md guardrail is "do NOT break the app or UI."

## Sign-off

All required checkboxes above are ticked. Merge `ralph/engagement-ui-enhancement` → `main` and close the engagement-UI-enhancement initiative.

---

## 2026-05-05 — Expanded suite (27 flows) production-readiness run

A new master suite `qa-00-full-suite.yaml` orchestrating 27 child flows (auth × 5,
tenant × 13, admin × 8, cross-cutting × 2) was authored after the original UAT rollup
above was signed off. This run is a separate gate.

### Environment

- macOS Darwin 25.4.0, iPhone 16 Pro Max simulator (UDID 44D8AC0F…), iOS 18.6
- Maestro 2.4.0 (Java 21 from `/opt/homebrew/opt/openjdk@21`)
- App: `com.unitapp.mobile` from
  `~/Library/Developer/Xcode/DerivedData/UNIT-cjzihlijxoffqvdvqivtgjlpnwxe/.../UNIT.app`
  (cached debug build, freshly reinstalled before C4 + C5)
- Metro: `npx expo start --port 8081` (canonical port — auto-fallback to 8082 was
  observed and broke 11 flows that hardcode `:8081`; restarted on canonical port)
- Supabase: project `ouvneoaqoilnigynlvbp` ("UNIT Shane")

### Seed verification (preflight)

| Item | Status |
|---|---|
| `tenant1@unit-test.com`, `david@cultrhealth.com` profiles | ✓ |
| Test property has lat/lon (29.244, −81.046) | ✓ |
| ≥1 active `promotion_price_tiers` row | ✓ (2: 7-day $25, 30-day $99) |
| `tenant-reset@unit-test.com` profile | **MISSING** (blocks `qa-auth-03`) |
| ≥1 unread notification for tenant1 | **0** (blocks `qa-alerts-01`) |
| ≥4 pending advertiser promotions for david's property | **0** (blocks `qa-admin-04/05`) |
| ≥1 approved advertiser promo with `cta_link` | **0** (blocks `qa-promotions-01`, `qa-promotion-detail-01`) |

### Run scoreboard

| Batch | Flows | Pass | Fail | Notes |
|---|---|---|---|---|
| C1 Auth | 5 | 0 | 5 | All ran ~50 steps before single-assertion FAIL |
| C2 Tenant | 10 | 1 | 9 | `qa-home-01-feed-states` ✓ |
| C3 Profile | 3 | 0 | 3 | All fail in shared logout subflow |
| C4 Admin | 8 | 0 | 8 | All stuck on dev-client launcher (timing flake after rapid reinstalls) |
| C5 Cross-cutting | 2 | 0 | 2 | Stripe text expected; permissions flow died at 6s |
| Stripe (m5-02) | 1 | — | — | **Deferred** — dev Edge Function STRIPE_SECRET_KEY not confirmed |
| **Total** | **28** | **1** | **27** | |

### Failure classification

**FLOW (selector / coordinate / timing drift) — primary cause across ~16 flows**

- `subflows/logout.yaml` line 16 uses `tapOn: { point: "65%,56%" }` to confirm the iOS
  native "Log Out" alert. iOS alert positioning shifted; coordinate misses the confirm
  button so the user stays logged in, then `extendedWaitUntil "Log In"` times out at 60 s.
  **Fix:** replace coordinate tap with text-based selector
  (`tapOn: { text: "Log Out", index: 1 }` or use the alert button label directly).
- `qa-auth-01-login-validation.yaml` taps "Forgot password?" with the keyboard still up,
  so the tap maps onto a keyboard key and an extra "y" lands in the email field. Add
  `hideKeyboard` between input and the link tap.
- `qa-permissions-01-push-photo.yaml` died in 6 s — likely an early `tapOn` selector
  miss; needs screenshot review.

**ENV (seed gaps + dev-client launcher) — secondary cause across ~8 flows**

- 4 seed-data gaps documented above.
- C4 batch (admin) showed all 8 flows timing out on the dev-client launcher screen —
  the React Native bundle didn't load into the dev client after `launchApp` even
  though Metro was healthy and bundling. Root cause appears to be the rapid
  uninstall/reinstall cycle between batches. **Mitigation:** insert a 3-5 s settle
  step or an explicit `extendedWaitUntil "Log In"` *after* the launcher tap.

**CODE (genuine app bug) — none confirmed in this pass**

- No clear application-level bugs were surfaced by this run. Most failures stopped at
  flow infrastructure issues before reaching app logic. Re-run after FLOW + ENV fixes
  to actually exercise the app.

**Stripe — deferred**

- `m5-02-tenant-paid-promotion.yaml` (tagged `stripe`) and `qa-deeplink-01-stripe-return.yaml`
  both depend on the dev Edge Function having `STRIPE_SECRET_KEY` in test mode. Verify
  this with `npx supabase secrets list` before next run; m5-02 was previously green
  (signed off above), so any failure here is environmental, not new.

### Production gate — NOT MET

- [x] Phase A preflight (seeds noted above)
- [x] Phase B smoke (login pipeline OK)
- [ ] **All 27 flows green** ← only 1/27 actually pass; 27 require triage
- [ ] No P0/P1 CODE failures ← cannot assert until FLOW/ENV are cleared and app logic is actually exercised
- [ ] Stripe end-to-end ← deferred

### Recommended next pass (sequenced)

1. **Fix `subflows/logout.yaml`** — replace coordinate tap with text-based alert button selector. This single change should unblock ~8 flows.
2. **Seed gaps** — insert tenant-reset account, unread notification, 4+ pending promos, 1 approved promo with CTA. Follow `unit/scripts/seed-e2e-test-data.sql` plus admin-flow seed creation.
3. **Add launcher settle** — either edit each flow's launcher block or add a global `--config` entry to `maestro/config.yaml` to wait for app shell after dev-client tap.
4. **Verify Stripe test keys** — `npx supabase secrets list` against the dev project.
5. **Re-run all 5 batches.** Iterate on per-flow text-drift assertions.
6. Only after every flow passes (or has an explicit signed CODE follow-up) is the suite a production gate.

### Artifacts

All Maestro debug bundles in `~/.maestro/tests/2026-05-05_15{2644…5223}/`. Per-batch
JUnit XML at `/tmp/maestro-c{1,2,3,4,5}.xml`. Single-flow screenshots are in each run
dir (red-X PNG names map to the failed flow).
