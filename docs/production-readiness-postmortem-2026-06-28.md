# Production Readiness Hardening Postmortem

## Summary

A production-readiness hardening pass correctly produced a fresh iOS store build, green release checks, and a fail-closed evidence gate, but the first implementation had several near misses: source-of-truth files were briefly created outside the tracked mobile repo, one doc still referenced a stale local path, and non-E2E evidence was initially recorded as pass text without freshness metadata. No customer-facing system was impacted, but the session exposed how a polished readiness summary can drift from durable, reviewable release evidence unless the repo enforces that distinction.

## Status

Current status: Mitigated

Severity: SEV4 near miss / learning event

Confidence: High

## Evidence Basis

Known facts:

- The default readiness gate fails closed while App Store Connect auth is blocked.
- The handoff mode reports `launchReady: false` while allowing external blockers for inspection.
- `portal npm run release:check` and `unit npm run release:check` passed after the hardening changes.
- A fresh EAS iOS production store build exists: `863509ab-99cd-4234-83f5-07d0a7298a7a`, version `1.0.0`, build `15`.
- App Store Connect auth still fails because Apple reports a missing or expired agreement.
- The tracked source of truth now lives in `unit/scripts/check-production-readiness-evidence.mjs` and `unit/docs/production-readiness-evidence.json`.

Assumptions / hypotheses:

- Root-level files are less durable because the root is an umbrella project, while `unit/` and `portal/` are the real git repos.
- A release owner may run the evidence gate from root, `unit/`, or `portal`, so all three entrypoints should behave consistently.
- Evidence older than the configured freshness windows should be revalidated before handoff.

Unknowns:

- Whether the Apple agreement has since been accepted after the last `appstore:auth:check`.
- Whether the hosted `STRIPE_WEBHOOK_SECRET` exactly matches the current live endpoint secret; this requires live webhook delivery proof.
- Whether Sentry DSNs will be configured or explicitly accepted as a launch warning.

## Impact

| Area | Impact | Evidence | Duration / scope |
|---|---|---|---|
| Customers | No direct customer impact | No production deploy or customer launch was performed | Internal-only |
| Release confidence | Risk of overclaiming launch readiness | Earlier summaries had to distinguish local green from Apple blocker | Current session |
| App Store launch | Still blocked externally | `appstore:auth:check` failure | Until Apple agreement is signed |
| Payments | Live webhook route configured but final live reconciliation pending | Stripe endpoint verified; hosted secret equality not proven | Until live payment test |
| Repo hygiene | Dirty worktree makes release scope harder to audit | `git status` shows unrelated existing changes | Current checkout |

## Timeline

| Time / phase | Event | Evidence | Notes |
|---|---|---|---|
| Phase 1 | Production release checks and E2E were rerun | Portal and mobile release checks passed; iOS `28/28`; Android targeted `4/4` | Strong code/testing signal |
| Phase 2 | Fresh iOS production build was created | EAS build `863509ab-99cd-4234-83f5-07d0a7298a7a` finished | Build exists but cannot submit yet |
| Phase 3 | App Store Connect auth was rerun | Fastlane reports missing/expired agreement | External hard blocker |
| Phase 4 | Premortem hardening added evidence gate | `production:readiness:check` introduced | Correct direction |
| Phase 5 | Double-check found durability/semantics gaps | Root-only files, stale doc path, recorded-pass evidence | Near misses |
| Phase 6 | Mitigations added | Source of truth moved into `unit`; freshness metadata enforced | Current state |

## What Went Well

- Release checks were rerun after changes instead of relying on earlier terminal scrollback.
- The E2E artifact summaries were used as machine-readable evidence.
- The new gate fails closed by default instead of turning external blockers into green status.
- The Android driver flake was isolated with a targeted persistent-driver rerun rather than accepted as a product bug.
- Generated Fastlane/Maestro artifacts were cleaned without reverting unrelated user work.

## What Went Wrong

- The first premortem artifacts were created at the umbrella root, which is not the primary git boundary.
- The initial evidence checker mechanically validated E2E summaries but trusted command/provider pass text without freshness metadata.
- A doc still referenced an obsolete local path, which could send a future release operator to the wrong checkout.
- The worktree already contained many unrelated changes, increasing the risk of mixing release hardening with other edits.
- The launch status had to be corrected repeatedly because "code-ready" and "store-ready" are different states.

## Detection And Response Analysis

- How it was detected: Re-running `git status`, `rg` for stale paths, and the new readiness gate exposed the weak spots.
- How it should have been detected: The premortem patch should have included a source-of-truth check and freshness metadata on the first pass.
- What slowed diagnosis: Multiple git repos under one umbrella root and existing unrelated dirty files made ownership boundaries noisier.
- What slowed mitigation/recovery: Root package/docs are useful for local workflow but not independently versioned like `unit/` and `portal`.
- What reduced blast radius: No production deploy/submission was performed; all changes were local docs/scripts; external blocker remained fail-closed.
- What increased blast radius: Broad production-readiness objective and high autonomy could have encouraged overclaiming if evidence was not forced into a gate.

## Contributing Factors

| Factor | Category | How it contributed | Evidence / confidence |
|---|---|---|---|
| Umbrella root is not the real git repo | Process/tooling | Initial files could have been less durable if kept only at root | High |
| Recorded pass evidence lacked freshness | Verification | A stale provider or command result could remain green | High |
| Existing dirty worktree | Process | Makes it harder to identify which changes are release-critical | High |
| External Apple blocker | Vendor/legal | Prevents final App Store submit despite code/build readiness | High |
| Missing Sentry DSNs | Observability | Reduces incident diagnosis quality after launch | Medium |
| Hosted webhook secret cannot be read back | Provider/security | Forces live delivery proof instead of local equality proof | High |
| Long agent session | AI/automation | Context decay increases risk of ghost assumptions | Medium |

## Root Cause Analysis

- Immediate cause: The initial hardening pass added a useful evidence gate, but did not fully encode evidence freshness or source-of-truth repo boundaries.
- Underlying causes: UNIT uses an umbrella project with separate git repos, production readiness spans code, E2E, providers, store accounts, billing, and docs, and several checks depend on external states that local tests cannot prove.
- Systemic causes: The release process previously relied on narrative summaries plus command output more than a durable, fail-closed evidence artifact.
- Failed or missing controls: No evidence freshness check, no explicit postmortem action register, no source-of-truth validation for the readiness docs/scripts.
- Why it was not caught earlier: The first version of the gate passed the immediate semantic test of blocking App Store readiness, but did not stress stale evidence or repo-boundary failure modes.
- Why recurrence is possible without action: Future release owners could update prose while leaving stale pass records, or run the right command from the wrong repo context.

## Corrective Actions

| Action | Type | Priority | Owner/role | Due/urgency | Verification | Maps to cause/control |
|---|---|---:|---|---|---|---|
| Move readiness checker and evidence register into `unit/` source of truth | Prevent/document | P0 | Release engineer | Done | `unit/scripts/check-production-readiness-evidence.mjs` exists and scripts call it | Repo-boundary control |
| Keep root, `unit`, and `portal` command aliases for the same gate | Prevent/automate | P0 | Release engineer | Done | All three `production:readiness:check` entrypoints run | Operator consistency |
| Require `verifiedAt` and freshness windows for recorded evidence | Detect/prevent | P0 | Release engineer | Done | Checker fails missing/stale evidence unless `--allow-stale-evidence` is explicit | Stale evidence control |
| Add readiness checker self-test | Test | P0 | Release engineer | Done | `cd unit && npm run production:readiness:self-test` passes | Prevents blocked-gate masking regression |
| Preserve App Store Connect as a hard blocker | Prevent/decide | P0 | Account Holder / release owner | Before submit | Default gate exits nonzero while blocker exists | External blocker control |
| Add this postmortem and action register | Document/respond | P1 | Release engineer | Done | This file exists and is linked from evidence | Learning loop |
| Revalidate live Stripe with a low-dollar payment | Test/detect | P0 | Release owner | After Apple unblock / before public launch | Stripe + Supabase reconciliation succeeds | Webhook-secret uncertainty |
| Configure or explicitly accept Sentry DSNs | Decide/monitor | P1 | Release owner | Before public launch | DSN present or warning accepted in evidence | Observability gap |
| Review dirty worktree before commit/deploy | Prevent | P0 | Release engineer | Before staging/commit | Explicit staged paths only; no unrelated files staged | Scope control |

## Follow-Up Checks

| Check | When | Owner/role | Success criterion |
|---|---|---|---|
| `npm run production:readiness:check` | Before submit/handoff | Release engineer | Exits 0 without external-blocker override |
| `npm run production:readiness:check -- --allow-external-blockers --json` | During blocked handoff | Release engineer | `launchReady` remains false and blockers are visible |
| `cd unit && npm run production:readiness:self-test` | After checker changes | Release engineer | Synthetic blocked/stale gates fail as expected |
| `cd unit && npm run appstore:auth:check` | After Apple agreement accepted | Account Holder / release engineer | Exits 0 |
| `cd unit && npm run release:ios:submit` | After auth green | Release engineer | Submits build `15` or newer |
| Live Stripe reconciliation | Before public paid flow | Release owner | Stripe event and Supabase state all match |

## Future Premortem Updates

- Add this failure mode: production readiness evidence can be true when written but stale by launch time.
- New warning signal: evidence gate has pass records without `verifiedAt`, `maxAgeHours`, or artifact-backed validation.
- New rollback/kill criterion: pause launch language if `launchReady` is false, even when `ok` is true under an external-blocker inspection mode.
- New question to ask before similar work: "Which repo owns this evidence, and what will fail if the evidence ages out?"

## Reusable Lesson

For production readiness, a green summary is not a control. A durable launch process needs source-of-truth evidence, freshness rules, explicit blockers, and a command that fails in the same way a release owner should decide.
