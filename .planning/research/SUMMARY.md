# Project Research Summary

**Project:** UNIT — Multi-Tenant Property Community SaaS
**Domain:** Commercial multi-tenant property management SPA (gap-closure milestone)
**Researched:** 2026-03-25
**Confidence:** HIGH (stack and pitfalls verified against official docs and codebase; features and architecture HIGH on industry patterns, MEDIUM on Base44-specific internals)

## Executive Summary

UNIT is an existing React 18 / Base44 BaaS property management SPA undergoing a gap-closure milestone — not a greenfield build. The product has working tenant/landlord flows, but has critical security gaps (landlord auth is client-side sessionStorage only, multiple accounting routes have no guard at all), missing financial workflows (invoice lifecycle is incomplete, Stripe is installed but unwired), and no automated testing. Research across all four domains converges on a clear recommendation: fix the security foundation first, then layer financial features and communications on top of it, and add payment collection and analytics last when the data model is stable and trusted.

The recommended approach is to stay entirely within the Base44 ecosystem for auth hardening, email, and payment integration — Base44 provides native Stripe Checkout, a first-party Resend integration, entity-level Row Level Security, and Deno backend functions that eliminate the need for a separate backend server. Net-new library requirements are minimal: upgrade the existing Stripe packages to compatible versions, add `qrcode.react` for the QR component wrapper, install the Vitest testing stack (all dev deps), and add `@react-email` for authoring email templates. SLA tracking and auth hardening require no new packages at all.

The primary risks in this milestone are security (client-side-only auth is actively exploitable today), payment state integrity (updating invoice status from client-side Stripe confirmation rather than webhooks), and email deliverability (DNS authentication must precede any production send). Each risk has a documented prevention path that fits within the Base44 BaaS constraint. The secondary risk is TanStack Query cache contamination when multi-property switching is introduced — a known pattern with a documented fix (full cache invalidation on switch).

---

## Key Findings

### Recommended Stack

The existing stack (React 18, Vite, Tailwind, shadcn/ui, TanStack Query v5, Base44 SDK) requires no structural changes. All six gap areas are addressed with targeted additions or configuration changes, not architectural rewrites. Base44's built-in role field, RLS rules, entity automations, Stripe Checkout integration, and Resend integration are the primary tools. The Deno backend functions runtime handles all server-side secrets (Stripe keys, Resend API key) without exposing them to the browser bundle.

**Core technologies and additions:**
- **Base44 RLS + role field:** Server-side auth enforcement — requires zero new packages, only platform configuration
- **`@stripe/react-stripe-js@^5.6.1` + `@stripe/stripe-js@^8.11.0`:** Upgrade both Stripe packages together (current versions in package.json are mismatched and incompatible with each other)
- **`qrcode.react@^4.2.0`:** React wrapper for the `qrcode` engine already installed; enables proper `QRCodeSVG` component rendering
- **`resend` (Deno import, not npm):** Imported as `npm:resend@6` in Base44 backend functions; API key stored as a Base44 Secret; first-party Resend integration documented by Base44
- **`@react-email/components@^1.0.10` + `@react-email/render@^2.0.4`:** Dev deps for authoring HTML email templates as React components; rendered server-side in Deno functions, never shipped to the browser bundle
- **`vitest@^4.1.1` + `@testing-library/react@^16.3.2` + jest-dom + user-event + jsdom:** Full test stack as dev deps; Vitest reuses existing `vite.config.js` with a single added `test` block
- **`date-fns` v3.6.0 (already installed):** Covers all SLA date arithmetic via `addBusinessDays()`, `differenceInHours()`, `isPast()`

**What NOT to add:** Nodemailer (no Base44 integration path), Jest (requires Babel for JSX in Vite projects; Vitest is a drop-in replacement), Stripe in frontend code (secret key exposure), moment (already flagged as legacy in codebase).

### Expected Features

Research confirms a clear split between features required to close the security/functional gaps this milestone targets versus features to add once the foundation is stable.

**Must have (P0 — blocks trust in the product):**
- Server-side role enforcement via Base44 RLS — the current sessionStorage pattern is trivially bypassed
- Centralized route guard via `LandlordGuard` React Router v6 `<Outlet>` wrapper — Accounting and LandlordRequests currently have no guard at all
- Audit trail (append-only AuditLog entity) — required for any landlord trusting financial data; must document the coverage start date in the UI
- Multi-property account switching — currently broken for multi-property operators; must be backed by server-validated property ownership, not just client state

**Must have (P1 — closes functional gaps):**
- Invoice lifecycle state machine (draft → sent → viewed → paid → overdue → void) — current model has no state transitions
- SLA targets + assignment + escalation for recommendations — commercial property differentiator; use business-day deadlines, not calendar hours
- Transactional email for 6 key events — closes async notification gap; requires DNS authentication (SPF/DKIM) before any production send
- Standards-compliant QR code — largely already working (`qrcode` v1.5.4 is installed and URL-encoding correctly); confirm with device testing and close

**Should have (P2 — adds revenue and insight, but needs stable foundation):**
- Stripe payment collection (Stripe Checkout, not Connect; webhook-authoritative payment state)
- Analytics dashboard with 6 operational KPIs (recharts already installed; primarily data wiring)
- Accounting export CSV/PDF (jspdf already installed; primarily button wiring)

**Defer to v2+:**
- Tenant-facing Stripe Checkout payment portal (requires Stripe onboarding complete)
- Property manager sub-role (no evidence of demand yet)
- SMS notifications (A2P 10DLC compliance, marginal benefit over email for property cycles)
- Full double-entry bookkeeping (separate product category)

### Architecture Approach

The recommended architecture keeps the existing SPA structure intact and adds three new layers: a centralized auth/route guard layer (`LandlordGuard`, `PropertyGuard` in `src/components/guards/`), a property context layer (`PropertyContext` in `src/lib/`), and a thin audit utility (`AuditLogger.js` in `src/lib/`). Email notifications are handled entirely as Base44 entity automations — no frontend code — to avoid the "fire email from useMutation.onSuccess" anti-pattern where component unmount can skip the call. Error boundaries wrap each route segment using `react-error-boundary`.

**Major components:**
1. **`LandlordGuard` (new)** — React Router v6 `<Outlet>` wrapper; reads `user.role` from `AuthContext`; redirects non-landlords to `/Unauthorized`; replaces all per-page sessionStorage checks
2. **`PropertyContext` (new)** — Holds `activePropertyId` for multi-property switching; persists to localStorage; triggers TanStack Query cache invalidation on switch via query key dependency
3. **`AuditLogger.js` (new)** — Single module called from `useMutation.onSuccess` for all financial/status mutations; fire-and-forget (audit failure must not block primary mutation)
4. **Base44 entity RLS rules (platform config)** — The actual security boundary; role-scoped CRUD rules on Lease, Invoice, Payment, Expense, RecurringPayment entities
5. **Base44 Automations + Resend backend function** — Server-side email triggers on entity events; completely decoupled from frontend code
6. **Vitest + React Testing Library test suite** — Unit tests beside source files; E2E with Playwright for critical paths (landlord login, status change, invoice creation)

**Data flow patterns confirmed:**
- Auth check: `App loads → base44.auth.me() → user.role in AuthContext → LandlordGuard reads role → RLS enforces at data layer`
- Status change: `useMutation → Base44 RLS validates → onSuccess: writeAudit → Base44 Automation → Resend email`
- Property switch: `PropertyContext.switchProperty() → localStorage update → queryClient.invalidateQueries() → data refetches`
- Payment: `Invoice set to processing → redirect to Base44 Stripe Checkout → Stripe webhook → backend function updates Invoice to paid`

### Critical Pitfalls

1. **Accounting routes have no auth guard today** — `Accounting.jsx` and `LandlordRequests.jsx` have zero session protection. Any user with a valid `propertyId` URL can read all financial data. Fix in P0 before any other work ships.

2. **propertyId URL substitution (cross-tenant data read)** — All queries scope by `propertyId` from the URL with no server-side ownership check. A landlord for Property A can read Property B's data by changing the URL param. Fix requires Base44 entity RLS rules or a server function that validates ownership before the multi-property switching feature ships.

3. **Stripe payment state must be webhook-authoritative, not client-authoritative** — Updating Invoice to `paid` inside `confirmPayment().then(...)` on the client is the most common Stripe integration mistake. The client response is provisional; delayed payment method failures will desync state silently. The client should set Invoice to `processing`; the webhook sets it to `paid` or `failed`.

4. **Email DNS authentication must precede any production send** — SPF/DKIM/DMARC records must be live on the sending subdomain before the first production transactional email. Testing against personal Gmail addresses masks the problem. Gmail and Yahoo reject senders above 0.1% complaint rate, and reputation damage persists.

5. **SLA timers in calendar hours cause Monday morning breach floods** — A 48-hour SLA target counts weekends. A Friday 5pm submission breaches by Sunday 5pm before anyone is in the office. Use `date-fns addBusinessDays()` or express SLAs in business days, not calendar hours. Document the choice explicitly in the UI.

6. **Auth migration disrupts all active landlord sessions** — Switching from `landlord_code` + sessionStorage to user-role accounts logs out every mid-session landlord simultaneously. Run both auth paths in parallel for one deploy cycle; show a clear explanation message on the old code-input path rather than silently redirecting to a blank page.

7. **Multi-property TanStack Query cache contamination** — Switching properties without calling `queryClient.invalidateQueries()` leaves stale Property A data rendering in Property B context. Financial totals appear wrong with no error thrown. Full cache invalidation (or `queryClient.clear()`) must be atomic with the property switch.

---

## Implications for Roadmap

Based on the combined research and the explicit dependency graph confirmed in both FEATURES.md and ARCHITECTURE.md, a four-phase structure is recommended.

### Phase 1: Security and Access Control

**Rationale:** The existing auth is client-side only and actively exploitable. Every feature built on top of broken auth inherits the security gap. The build order in ARCHITECTURE.md is explicit: user role field in Base44 is the prerequisite for everything else. This phase also eliminates the `sessionStorage` pattern across all landlord routes, which is the root cause of the accounting route exposure.

**Delivers:** A secure landlord session foundation. Landlords authenticate via Base44 user accounts with server-enforced roles. All landlord routes are behind a centralized `LandlordGuard`. Base44 entity RLS rules block data access even if the UI guard is bypassed. The `landlord_code` field on Property is either removed or access-restricted. Multi-property switching is introduced here because the switching mechanism itself is a security boundary (property ownership must be server-validated before the switch).

**Features addressed:**
- Server-side role enforcement (Base44 RLS + user.role field)
- Centralized `LandlordGuard` route wrapper (replace all per-page sessionStorage checks)
- Multi-property account switching with server-validated ownership
- Audit trail foundation (AuditLog entity + AuditLogger.js)
- Auth migration communication (parallel code path for one deploy cycle)

**Pitfalls to prevent:** Pitfall 1 (unguarded accounting routes), Pitfall 2 (propertyId substitution), Pitfall 3 (auth migration session disruption), Pitfall 6 (audit coverage boundary), Pitfall 7 (TanStack Query cache contamination on switch)

**Stack additions:** No new npm packages. Base44 Dashboard configuration for role field, RLS rules, and AuditLog entity.

---

### Phase 2: Financial Operations and Compliance

**Rationale:** With auth hardened, financial features can be built on a trusted foundation. The invoice lifecycle state machine is a prerequisite for Stripe (you can't attach payment state to invoices that have no state machine). The audit trail, already established in Phase 1, is applied to all financial mutations in this phase. Email notifications for financial events belong here because they're triggered by invoice status transitions.

**Delivers:** A complete invoice tracking workflow, SLA-governed request management, transactional email for all key events, and a confirmed-working QR code. Landlords can track all financial activity with an audit trail, and tenants receive async email notifications for relevant status changes.

**Features addressed:**
- Invoice lifecycle (draft → sent → viewed → paid → overdue → void) with audit writes on all transitions
- SLA targets + assignment + escalation for Recommendation entity (business-day deadlines, not calendar hours)
- Transactional email for 6 trigger events via Base44 Automations + Resend
- QR code device verification and close (low effort; likely already working)

**Pitfalls to prevent:** Pitfall 5 (email DNS auth before first production send), Pitfall 8 (SLA calendar hours / weekend breach floods), "looks done but isn't" for SLA escalation loop (escalation fires once, not on every evaluation cycle)

**Stack additions:** `@react-email/components`, `@react-email/render` (dev deps for email templates). DNS configuration for sending subdomain (SPF/DKIM/DMARC) — required before this phase ships to production.

---

### Phase 3: Automated Testing and Quality

**Rationale:** After two phases of net-new code with zero prior test coverage, this phase establishes a testing foundation before higher-complexity integrations (Stripe) are added. Testing the auth guard and audit logger in isolation is significantly easier than testing them entangled with payment flows. The STACK.md research recommends starting with unit/integration tests before adding E2E tools — this is the right moment.

**Delivers:** A test suite covering critical business logic, with CI integration. Auth guards, SLA deadline calculations, invoice state transitions, and audit write behavior are all covered. Error boundaries are added to all route segments. TanStack Query `staleTime` is tuned to 5 minutes for graceful handling of transient connectivity issues.

**Features addressed:**
- Vitest unit/integration test suite for: LandlordGuard, AuditLogger, PropertyContext state transitions, SLA deadline calculations, invoice status state machine
- Error boundaries at route segment level (`react-error-boundary`)
- TanStack Query staleTime tuning

**Pitfalls to prevent:** "Looks done but isn't" for test suite (behavioral tests, not implementation tests), 100% coverage trap (cover critical paths only)

**Stack additions:** `vitest@^4.1.1`, `@testing-library/react@^16.3.2`, `@testing-library/user-event@^14.6.1`, `@testing-library/jest-dom@^6.9.1`, `jsdom` (all dev deps). `vite.config.js` `test` block addition.

---

### Phase 4: Payment Collection and Analytics

**Rationale:** Stripe requires a stable invoice lifecycle (Phase 2) and error handling (Phase 3) before it can be safely integrated. Base44's native Stripe Checkout integration (Builder plan) handles key management server-side, keeping the architecture within the BaaS constraint. Analytics and export are also placed here because they depend on accumulated, clean financial data from Phase 2 operations.

**Delivers:** Tenant payment collection via Stripe Checkout with webhook-authoritative invoice status. Enriched analytics dashboard with 6 operational KPIs. Accounting export in CSV (invoice list, expenses) and PDF (financial summary, lease roll).

**Features addressed:**
- Stripe Checkout integration (not Connect; single landlord account; ACH priority alongside card)
- Webhook handler via Base44 backend function for authoritative payment state
- Analytics dashboard: occupancy rate, collection efficiency, outstanding receivables, request resolution rate, average days-to-resolve, lease renewals upcoming
- Accounting export: CSV (invoices, expenses) and PDF (financial summary, lease roll)

**Pitfalls to prevent:** Pitfall 4 (client-authoritative Stripe state — webhook must own payment status), Stripe test/production key mismatch (environment variable assertion at app startup), Stripe webhook signature validation (reject unsigned payloads)

**Stack additions:** Upgrade `@stripe/react-stripe-js` to `^5.6.1` and `@stripe/stripe-js` to `^8.11.0` (must upgrade both together; current versions in package.json are incompatible with each other).

---

### Phase Ordering Rationale

- **Security before features:** ARCHITECTURE.md's build order section is explicit — the user role field in Base44 blocks all other auth hardening. Shipping features on a broken auth foundation is not a deferred risk; it is an active exploit.
- **Invoice lifecycle before Stripe:** Stripe webhooks update invoice status; the lifecycle state machine must exist as a target before payment events can be applied to it.
- **Testing before payment integration:** Stripe introduces the highest-complexity integration in this milestone. Establishing test infrastructure first means payment flows can be validated against controlled fake data (MSW intercepting Base44 SDK HTTP calls).
- **Analytics last:** Analytics depend on data quality and volume from prior phases. A dashboard wired to incomplete financial data will mislead landlords.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Base44 RLS rule DSL syntax — the capability is documented conceptually but exhaustive code samples are limited. Verify exact rule syntax in Base44 Dashboard during implementation before writing the planning spec.
- **Phase 4:** Base44 Stripe Checkout flow details — existence confirmed in official docs (January 2026 release), but exact session creation API and webhook receipt mechanics need hands-on verification. Builder plan requirement must be confirmed for the target environment.

Phases with well-documented patterns (skip research-phase):
- **Phase 2 (Email):** Resend + Base44 integration is documented end-to-end. Email trigger patterns via Base44 Automations are standard.
- **Phase 2 (SLA):** date-fns business-day arithmetic is fully documented. The SLA data model additions are straightforward.
- **Phase 3 (Testing):** Vitest + RTL setup is extremely well-documented. The Vite config addition is a known, stable pattern.
- **Phase 4 (Analytics):** recharts is already installed; KPI calculation logic is standard date-range aggregation.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommended additions verified against npm registry and official docs as of 2026-03-25. Stripe version compatibility confirmed. Resend Base44 integration documented first-party. One exception: `qrcode.react@^4.2.0` is MEDIUM (last published ~1 year ago, stable but not actively developed). |
| Features | HIGH | Feature set confirmed against multiple property management competitors (AppFolio, Buildium, Landlord Studio). Feature dependency graph is internally consistent. Anti-features are well-reasoned with documented alternatives. |
| Architecture | MEDIUM-HIGH | React Router v6 guard patterns, TanStack Query cache invalidation, and audit log table design are all HIGH confidence. Base44 RLS rule DSL syntax is MEDIUM (capability confirmed, exact syntax needs verification during implementation). Base44 Stripe webhook behavior is MEDIUM (explicitly documented limitation: automations require active user session; backend functions for webhooks are described conceptually). |
| Pitfalls | HIGH | Critical pitfalls (Pitfall 1, 2) are confirmed by direct codebase inspection of `Accounting.jsx` and `LandlordRequests.jsx`. Integration pitfalls (Stripe state management, email DNS auth) are verified against official Stripe docs and deliverability guides from Postmark/Mailgun. |

**Overall confidence:** HIGH

### Gaps to Address

- **Base44 RLS rule syntax:** The RLS capability is confirmed but the exact DSL for `user.role` checks in entity rules should be verified in the Base44 Dashboard before writing Phase 1 implementation tasks. If the syntax differs from what is documented, the guard implementation pattern may need adjustment.
- **Base44 Stripe Checkout on Builder plan:** The Stripe integration is documented as a January 2026 feature. Confirm the target Base44 environment is on the Builder plan before Phase 4 planning. If not, the Stripe flow requires a custom backend function approach (documented as a fallback in ARCHITECTURE.md Pattern 6).
- **`landlord_code` field access control:** The `landlord_code` field on the Property entity is currently readable by any authenticated tenant who lists properties. This must be addressed in Phase 1 — either remove the field once the role migration is complete or restrict it via Base44 field-level access rules. Research did not confirm whether Base44 supports field-level (column-level) security in addition to row-level security. Verify during Phase 1 implementation.
- **SLA business hours configuration:** The recommended approach is to express SLAs in business days using `date-fns addBusinessDays()`. The gap is whether landlords need configurable business hours (e.g., 8am–6pm M–F) or whether business-day deadlines without time-of-day precision are sufficient for this use case. This should be validated with a landlord before Phase 2 implementation.

---

## Sources

### Primary (HIGH confidence)
- `https://docs.base44.com/developers/backend/resources/entities/security` — RLS/FLS syntax, user_condition rules
- `https://docs.base44.com/Setting-up-your-app/Managing-access` — Admin vs User role distinction
- `https://docs.base44.com/developers/backend/resources/backend-functions/overview` — Deno runtime, asServiceRole
- `https://docs.base44.com/documentation/building-your-app/sending-emails` — Built-in SendEmail vs Resend limitation
- `https://docs.base44.com/developers/backend/resources/backend-functions/automations` — Entity event triggers
- `https://docs.base44.com/documentation/setting-up-your-app/setting-up-payments` — Base44 Stripe Checkout flow
- `https://resend.com/docs/knowledge-base/base44-integration` — Native Resend + Base44 integration
- `https://github.com/stripe/react-stripe-js/releases` — v5.6.1 confirmed latest
- `https://www.npmjs.com/package/@stripe/stripe-js` — v8.11.0 confirmed latest
- `https://www.npmjs.com/package/vitest` — v4.1.1 confirmed latest
- `https://www.npmjs.com/package/@testing-library/react` — v16.3.2 confirmed latest
- Direct code inspection: `src/pages/LandlordLogin.jsx`, `src/pages/LandlordDashboard.jsx`, `src/pages/Accounting.jsx`, `src/pages/LandlordRequests.jsx`

### Secondary (MEDIUM confidence)
- `https://www.robinwieruch.de/react-router-private-routes/` — React Router v6 Outlet guard pattern
- `https://base44.com/blog/base44-stripe-integration` — Base44 Stripe integration architecture
- `https://stripe.com/resources/more/how-to-accept-rent-payments-online` — Stripe rent collection patterns
- `https://stripe.com/customers/re-leased` — Stripe Checkout for property management
- `https://postmarkapp.com/guides/transactional-email-best-practices` — DNS auth and deliverability
- `https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html` — Multi-tenant isolation
- `https://www.buildium.com/blog/property-management-kpis-to-track/` — Property management KPIs

### Tertiary (LOW confidence — needs validation during implementation)
- Base44 field-level security (column-level restriction for `landlord_code`) — capability not explicitly confirmed in docs reviewed
- Base44 Stripe webhook receipt mechanics via backend functions — described conceptually, not shown with full code samples

---

*Research completed: 2026-03-25*
*Ready for roadmap: yes*
