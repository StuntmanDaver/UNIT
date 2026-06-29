# Production Launch Premortem

## Plan Being Tested

Ship UNIT to customer-ready production with a fresh iOS App Store-distribution build, production portal readiness, live Stripe webhook configuration, production-safe mobile E2E evidence, and a fail-closed release path. Scope includes the Expo mobile app, Next.js advertiser portal, Supabase-backed production data paths, Stripe live checkout/webhook paths, EAS/App Store distribution, and operational handoff. The launch is partially reversible through code/config rollback, EAS build replacement, Stripe webhook replay, and host redeploys, but App Store review, live payments, user trust, and production data effects are only partially reversible.

## Assumptions I Am Making

- The current target production mobile app is `com.unitapp.mobile` with URL scheme `unit://`.
- The production portal target is `https://unit-portal-one.vercel.app`.
- The App Store-safe iOS suite intentionally excludes in-app paid Stripe Checkout.
- Live Stripe payment testing should happen only after App Store Connect access is unblocked and host webhook delivery is verified.
- Existing dirty worktree changes are user or prior-session work and must not be reverted without explicit approval.
- Sentry is recommended but currently accepted as a warning, not a hard launch gate.

## Failure Scenario

At T+1 day, the app has a fresh iOS build and local gates were green, but submission stalls because App Store Connect agreements were not checked as a hard gate. In parallel, the portal accepts a live Stripe checkout but the hosted webhook secret is stale, so payment succeeds in Stripe while promotion state remains unpaid in Supabase. Support receives confused advertiser and tenant reports, while crash telemetry is thin because Sentry DSNs were never configured. The team loses trust in the release because "green" meant local code health, not external account readiness.

## Executive Risk Verdict

Decision: Delay public/App Store submission until the external Apple agreement is fixed; greenlight continued internal hardening and TestFlight/EAS preparation.

Confidence: High.

Why: Code and E2E evidence are strong, and a fresh iOS store build exists. The remaining App Store blocker is confirmed by Fastlane, and live Stripe webhook-secret equality cannot be fully proven without a real hosted delivery event.

## Top Risks

| Rank | Risk | Domain | Probability | Impact | Detectability | Controllability | Early warning signal | Primary mitigation |
|---:|---|---|---|---|---|---|---|---|
| 1 | Apple agreement blocks submission | Legal/operations | High | Severe | Easy | Low | `appstore:auth:check` fails | Make ASC auth a hard gate |
| 2 | Live Stripe succeeds but webhook state update fails | Billing/data | Plausible | Severe | Moderate | Medium | Stripe event delivered but Supabase rows unchanged | Require low-dollar live payment reconciliation |
| 3 | Local green is mistaken for production-ready | Release/ops | Likely | High | Hard | High | Release summary omits provider blockers | Scripted evidence gate with explicit blockers |
| 4 | App Review rejects paid promotion flow | App Store policy | Plausible | Severe | Moderate | Medium | Reviewer asks about digital promotion purchase | Keep iOS App Store-safe suite/payment restriction and notes |
| 5 | Sentry/telemetry gap delays diagnosis | Observability | Plausible | High | Hard | High | User reports arrive before runtime traces | Configure DSNs or explicitly accept reduced visibility |
| 6 | Android Maestro flakes hide real regressions | QA/automation | Plausible | Moderate | Moderate | Medium | gRPC `7001` deadline errors | Persistent-driver rerun and artifact-based classification |
| 7 | Production Supabase QA seed harms real data | Data/ops | Unlikely | Severe | Moderate | High | QA seed touches non-QA rows | Keep production seed guard and expected URL pin |
| 8 | Dirty worktree changes get shipped unintentionally | Release/process | Plausible | High | Easy | High | `git status` includes unrelated files | Explicit-path staging and final diff review |
| 9 | Portal domain/deployment drift breaks checkout | Hosting | Plausible | High | Moderate | Medium | `/api/webhooks/stripe` route mismatch or 404 | Hosted smoke after deploy and Stripe endpoint URL verification |
| 10 | Support cannot handle first-week issues | Operations | Plausible | Moderate | Hard | Medium | Repeated manual questions, no owner/route | Launch runbook, reviewer accounts, support routing |

## Top 3 Risk Deep Dives

### 1. Apple Agreement Blocks Submission

- Failure mode: A finished iOS build cannot be submitted or managed through App Store Connect API.
- Why it could happen: Apple agreements expire or require account-holder acceptance outside the repo.
- Evidence / assumption / unknown: `npm run appstore:auth:check` currently fails with "A required agreement is missing or has expired."
- Blast radius: App Store submission, TestFlight distribution, and launch timeline.
- Early warning signals: Fastlane `Spaceship::ConnectAPI::App.find` fails before app lookup.
- Prevention: Treat App Store Connect auth as a hard readiness gate.
- Detection: Run `cd unit && npm run appstore:auth:check` before every submit attempt.
- Response / rollback: Account Holder signs the agreement, rerun auth check, then submit latest build.
- Owner-ready action: Accept pending Apple agreement in App Store Connect.
- Residual risk: Reduced after agreement is accepted; recurring risk if future agreements expire.

### 2. Live Stripe Webhook State Update Fails

- Failure mode: Advertiser payment succeeds in Stripe, but UNIT promotion/payment state does not update.
- Why it could happen: Hosted `STRIPE_WEBHOOK_SECRET` is encrypted and cannot be locally compared to the current endpoint secret; deployment/env drift can route events to stale code.
- Evidence / assumption / unknown: Live endpoint exists and local envs match, but hosted secret equality still needs live delivery proof.
- Blast radius: Advertiser trust, support load, revenue reconciliation, manual data repair.
- Early warning signals: Stripe shows successful payment and failed webhook, or Supabase rows stay `pending_payment`.
- Prevention: Require one low-dollar live payment test before public launch.
- Detection: Reconcile Stripe event, `stripe_webhook_events`, `promotion_payment_attempts`, `promotions`, and `promotion_status_events`.
- Response / rollback: Fix host env/deploy, replay Stripe event, repair affected promotion rows with audited script.
- Owner-ready action: After Apple unblocks release, run the live checkout reconciliation in the runbook.
- Residual risk: Reduced with live reconciliation; accepted only after webhook replay succeeds.

### 3. Local Green Is Mistaken For Production-Ready

- Failure mode: Release checks pass, but external providers, store approval, or live payment evidence are missing.
- Why it could happen: `release:check` proves build/test quality, not account/legal/provider readiness.
- Evidence / assumption / unknown: Current code gates are green while App Store Connect remains blocked.
- Blast radius: False launch confidence, failed submission, missed stakeholder handoff.
- Early warning signals: Final status says "ready" while `hardBlockers` still exist.
- Prevention: Maintain `unit/docs/production-readiness-evidence.json` and run `npm run production:readiness:check`.
- Detection: Evidence checker fails if any hard blocker remains.
- Response / rollback: Pause launch language, resolve blocker, rerun evidence gate.
- Owner-ready action: Use the evidence gate as the release-owner handoff source.
- Residual risk: Reduced; only as accurate as the evidence file and artifacts are current.

## Risk Register

| Risk | Domain | Cause | Effect | Probability | Impact | Detection difficulty | Mitigation | Residual risk |
|---|---|---|---|---|---|---|---|---|
| Apple agreement expired | Legal/ops | External Apple account state | Submit blocked | High | Severe | Easy | Hard gate on `appstore:auth:check` | Unresolved |
| Webhook secret mismatch | Billing/data | Hosted secret drift | Paid promotion not marked paid | Plausible | Severe | Moderate | Live payment reconciliation | Reduced after test |
| App Review payment rejection | Policy/product | Paid promotion purchase exposed in iOS | Rejection or delay | Plausible | Severe | Moderate | App Store-safe suite and review notes | Reduced |
| Sentry missing | Observability | DSNs unset | Slow incident diagnosis | Plausible | High | Hard | Configure DSNs or accept warning | Accepted warning |
| Dirty worktree shipped | Release/process | Multiple repos and prior changes | Unintended deploy diff | Plausible | High | Easy | Explicit staging and diff review | Reduced |
| Android driver flake | QA/tooling | Maestro gRPC port instability | False red/false confidence | Plausible | Moderate | Moderate | Persistent-driver targeted reruns | Reduced |
| Production QA seed misuse | Data | Wrong env/flags | Real data mutation | Unlikely | Severe | Moderate | Production guard and URL pin | Reduced |
| Portal deployment drift | Hosting | Wrong Vercel project/domain | Checkout/webhook broken | Plausible | High | Moderate | Hosted route smoke and Stripe endpoint verification | Reduced |
| Stripe restricted key lacks needed permission | Billing/ops | Least-privilege key too narrow | Runtime checkout/refund failures | Unlikely | High | Moderate | Exercise checkout/refund paths before launch | Reduced |
| Support readiness gap | Operations | No launch owner/runbook | Slow customer response | Plausible | Moderate | Hard | Support mailbox, reviewer accounts, triage owner | Accepted until owner assigned |
| Store metadata/privacy mismatch | Legal/policy | App behavior and metadata drift | Review rejection | Plausible | High | Moderate | Review packet and policy checklist | Reduced |
| Supabase migration drift | Data/backend | Production schema not aligned | Runtime data errors | Plausible | High | Moderate | Migration/status checks and relationship audit | Reduced |
| Push notification permissions fail | Mobile/platform | OS prompts and tokens differ | User-facing feature degraded | Plausible | Moderate | Moderate | E2E permission flow and runtime monitoring | Reduced |
| Expo/EAS credential drift | Build/release | Certificates/profiles expire | Build/submit blocked | Unlikely now | High | Easy | EAS credential check during build | Reduced |
| Agent overclaims readiness | AI workflow | Polished summary hides blockers | Bad decision | Plausible | High | Hard | Evidence gate and blocker language | Reduced |

## Assumptions To Validate

| Assumption | Why it matters | Validation method | Pass/fail threshold | Deadline/sequence |
|---|---|---|---|---|
| Apple agreement is accepted | Required for submit | `npm run appstore:auth:check` | exits 0 | Before submit |
| Hosted webhook secret matches endpoint | Required for payment state | Low-dollar live checkout and webhook replay/reconcile | Stripe + Supabase all updated | Before public paid flow |
| Store build 15 is the intended candidate | Required for App Store release | `eas build:view 863509...` and release-owner approval | status `FINISHED`, distribution `STORE` | Before submit |
| iOS App Store-safe surface excludes purchase | Required for review | App Store-safe Maestro + review notes | no iOS purchase path in suite | Before review |
| Sentry warning is accepted or fixed | Required for support confidence | DSN env check or written acceptance | DSN present or owner acceptance | Before public launch |
| Dirty worktree changes are intentional | Required for release integrity | `git status`, diff review, explicit staging | no unrelated files staged | Before commit/deploy |

## Tests, Monitors, And Tripwires

| Signal | How to measure | Threshold | Action if triggered |
|---|---|---|---|
| Production readiness evidence | `npm run production:readiness:check` | any failure | Do not call launch ready |
| App Store auth | `cd unit && npm run appstore:auth:check` | nonzero | Account Holder fixes Apple agreement |
| iOS E2E | `summary.json` for App Store-safe run | failed > 0 | Pause submit, fix/retest |
| Android recovery E2E | targeted summary artifact | failed > 0 | Classify app bug vs driver and rerun after cleanup |
| Portal release | `cd portal && npm run release:check` | nonzero | Do not deploy portal |
| Mobile release | `cd unit && npm run release:check` | nonzero | Do not build/submit |
| Stripe live webhook | Stripe Dashboard delivery + Supabase rows | delivery failed or rows unchanged | Fix env/deploy, replay event, repair data |
| Crash/error telemetry | Sentry or host logs | unexplained spike or no visibility | Pause rollout, configure telemetry |

## Rollout, Rollback, Escalation, And Kill Criteria

- Greenlight only if: release checks pass, E2E evidence is green, fresh store build exists, App Store auth passes, live webhook reconciliation passes, reviewer metadata/accounts are ready, and dirty worktree diff is reviewed.
- Pause if: any evidence gate fails, App Store auth fails, webhook delivery is unverified, or support ownership is unclear.
- Roll back if: live payment succeeds but app state does not update, production portal routes break, crash rate spikes, or App Review flags payment policy.
- Escalate if: Apple agreement remains blocked, provider credentials cannot be validated, live payment data diverges, or suspected unauthorized data access appears.
- Kill/redesign if: Apple rejects the promotion payment model as IAP-required, Stripe/webhook reconciliation cannot be made reliable, or production data isolation cannot be proven.

## Recommended Next Actions

1. Accept the pending Apple agreement, then rerun `cd unit && npm run appstore:auth:check`.
2. Submit EAS iOS production build `863509ab-99cd-4234-83f5-07d0a7298a7a` only after the auth gate passes.
3. Run one low-dollar live checkout and reconcile Stripe + Supabase before public customer launch.
4. Configure `NEXT_PUBLIC_SENTRY_DSN` and `EXPO_PUBLIC_SENTRY_DSN`, or explicitly accept the observability warning for this release.
5. Run `npm run production:readiness:check -- --json` before every release-owner handoff.

## Future Postmortem Evidence To Capture

- EAS build IDs, artifact URLs, submit IDs, and App Store Connect auth output.
- Stripe event IDs, webhook delivery screenshots/status, and Supabase reconciliation query results.
- E2E run IDs and `summary.json` files.
- Portal deploy IDs and env-check command output.
- Final git diff, staged paths, commit SHA, and release-owner approval timestamp.
