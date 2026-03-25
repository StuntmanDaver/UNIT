# Pitfalls Research

**Domain:** Multi-tenant property community SaaS — gap closure milestone (hardening a React SPA + Base44 BaaS)
**Researched:** 2026-03-25
**Confidence:** HIGH (critical pitfalls verified against code; integration pitfalls MEDIUM via multiple web sources)

---

## Critical Pitfalls

### Pitfall 1: Accounting Routes Have No Auth Guard At All

**What goes wrong:**
`LandlordDashboard.jsx` checks `sessionStorage.getItem('landlord_property_id')` in a `useEffect`. `Accounting.jsx` and `LandlordRequests.jsx` do not. Any user who knows a valid `?propertyId=` URL can access financial data — leases, invoices, expenses, payments — without any landlord session. This is not a theoretical risk; it is confirmed in the current source.

**Why it happens:**
Guards are added page-by-page by reflex, not systematically. The dashboard was protected first (it felt important), but downstream routes were added later and the guard was not copied. Client-side `useEffect` guards are also trivially bypassed by disabling JavaScript or directly manipulating `sessionStorage` in devtools.

**How to avoid:**
Create a single `<LandlordRoute>` wrapper component that reads the session check and redirects on failure. Wrap every landlord-facing route in `App.jsx` inside this component before adding any new feature. Do not trust that the current sessionStorage check is security — it is display gating only. Real enforcement requires server-side role validation on every Base44 entity query.

**Warning signs:**
- Any landlord-facing page that does not import and invoke the session check
- Guards placed inside `useEffect` (runs after render, so protected content is briefly visible)
- Different guard logic copy-pasted across pages rather than a single shared component

**Phase to address:** P0 — Security and Access Control (first phase of the milestone, before any new features are built)

---

### Pitfall 2: All Property Data Is Fetched by URL Parameter With No Ownership Validation

**What goes wrong:**
Every query in the app is scoped by `propertyId` from the URL: `base44.entities.Business.filter({ property_id: propertyId })`. If Base44 has no server-enforced row-level isolation, a landlord for property A can manually substitute property B's ID in the URL and read all of B's tenant data, financials, and requests. Multi-property landlord switching makes this worse — the switching mechanism must enforce that the authenticated account actually owns the target property.

**Why it happens:**
URL-driven state is convenient for SPA routing but conflates "navigation context" with "authorization context." The assumption that users will only know their own `propertyId` is not a security model.

**How to avoid:**
When adding multi-property switching, bind the permitted property list to the authenticated user account at the server/BaaS level, not just in client state. Verify Base44's access rule capabilities (field-level rules, role-based filter constraints) before writing the switching UI. If Base44 cannot enforce server-side property ownership, a proxy function layer is required before the switch feature ships.

**Warning signs:**
- `propertyId` is only sourced from `URLSearchParams` with no server-side ownership check
- Multi-property switching stores the target property in client state without a server confirmation step
- The session contains `landlord_property_id` (singular) — switching logic that overwrites this with a user-controlled value is a tenant-isolation failure

**Phase to address:** P0 — Security and Access Control

---

### Pitfall 3: Auth Migration Breaks Every Existing Landlord Session Simultaneously

**What goes wrong:**
When landlord auth migrates from shared `landlord_code` + `sessionStorage` to user-role accounts, every landlord who is mid-session will be logged out instantly. If the migration ships without a communication plan or a graceful fallback window, landlords discover the change mid-workflow (e.g., updating a request status) and face an unexplained redirect to login with a different flow they have not been told about.

**Why it happens:**
Auth migrations are treated as internal infrastructure changes. Developers ship the new system and remove the old one in the same deploy. The disruption is invisible in staging because testers know to re-login.

**How to avoid:**
Run both auth systems in parallel for one deploy cycle: new user-role accounts work, but the old code path returns a clear message ("Access codes are no longer supported — please contact support for your new login"). Do not silently redirect to a login page that no longer has a code input. Coordinate with landlords before the migration deploy.

**Warning signs:**
- The migration PR removes `LandlordLogin.jsx` code and the `landlord_code` field check in the same commit
- No communication step is included in the migration plan
- Staging test passes but only because the tester uses a fresh session

**Phase to address:** P0 — Security and Access Control

---

### Pitfall 4: Stripe Wired to Client State, Not Webhook State

**What goes wrong:**
Stripe dependencies exist in the project but are not active. The most common mistake when activating them is treating the Stripe API call response as the source of truth for payment state — updating the Invoice entity to `paid` immediately after `confirmPayment()` succeeds on the client. Stripe webhooks can then arrive later with a different event (e.g., `payment_intent.payment_failed` after a delayed bank decline) and the local state is already wrong. The two sources of truth drift apart silently.

**Why it happens:**
Client-side confirmation feels immediate and is easier to code. Webhooks require a receiving endpoint, which feels like "extra work" in a BaaS-constrained environment.

**How to avoid:**
Payment state must be owned by webhooks, not by client confirmation responses. The client-side flow sets Invoice status to `processing` and shows a pending UI. The webhook (via a Base44 serverless function or external endpoint) sets it to `paid` or `failed`. If Base44 cannot receive Stripe webhooks, this architecture is not possible and Stripe must be deferred until a proxy layer is available.

**Warning signs:**
- Invoice status is updated inside `confirmPayment().then(...)` on the client
- No webhook endpoint exists or is planned
- "Happy path" works in testing (Stripe test cards always succeed) but failure cases are untested

**Phase to address:** P2 — Stripe Integration

---

### Pitfall 5: Email Notifications Sent From App Domain Without SPF/DKIM, Going Straight to Spam

**What goes wrong:**
Email notifications are added using a transactional email service (SendGrid, Postmark, Resend), but the sending domain is not authenticated. Emails arrive in spam or not at all for the first batch of tenants. Because transactional emails are not monitored like marketing campaigns, the problem is discovered weeks later when tenants report they never received their lease expiry warning or request status update.

**Why it happens:**
SPF, DKIM, and DMARC records require DNS access, which feels like "infrastructure" and gets deferred. Developers test in staging with their own email address on Gmail (which has high trust) and see emails deliver fine.

**How to avoid:**
DNS authentication records must be set up before sending any production emails. Use a subdomain specifically for transactional email (e.g., `notifications.unitapp.com`) to isolate reputation from marketing sends. Use a service with built-in deliverability monitoring (Postmark or Resend for transactional, not SendGrid's marketing tier). Monitor bounce and spam complaint rates from day one.

**Warning signs:**
- Email is sent from `noreply@unitapp.com` but no SPF/DKIM records exist in DNS
- The sending domain is new and has no established reputation
- Testing was done with `@gmail.com` or `@developer.com` addresses only

**Phase to address:** P1 — Email Notifications

---

### Pitfall 6: Audit Trail Added as a Separate Log Table With No Backfill, Creating a False Sense of Coverage

**What goes wrong:**
An `AuditEvent` entity is created and new mutations write to it going forward. The system shows an audit trail in the UI. But existing `Recommendation` status changes and all financial record mutations before the migration have no history. A landlord disputes a lease change made last month and the audit trail is empty for that period. The trail "looks done" but only covers the post-migration window.

**Why it happens:**
Retroactive audit trail work is slow and unglamorous. Teams ship the forward-looking writer and declare the feature complete.

**How to avoid:**
Explicitly document the coverage boundary in the UI: "Audit history available from [date]." This is not a cop-out — it is honest reporting. Do not attempt to backfill by inferring history from current entity state (current `status` tells you nothing about when it changed or who changed it). For financial records, consider a one-time migration comment on existing records noting their pre-audit state.

**Warning signs:**
- The audit trail feature is marked complete but existing records show no history
- The UI implies audit coverage without a date boundary label
- Backfill was "planned but not done yet" and never prioritized

**Phase to address:** P0 — Security and Access Control (add audit writer to mutations); document coverage boundary in the same phase

---

### Pitfall 7: Multi-Property Switching Contaminates TanStack Query Cache Across Tenants

**What goes wrong:**
Landlord switches from Property A to Property B within one session. TanStack Query cache still holds stale data from Property A under the same query keys (e.g., `['businesses', propertyId]` where `propertyId` is the old value in a closure). A newly rendered component picks up cached Property A data while displaying the Property B UI. Financial totals or tenant counts are wrong without any error thrown.

**Why it happens:**
Query keys are constructed from `propertyId` fetched from the URL at component mount. If the property switch updates a context or session variable but the component does not remount (same route, different property), the query key does not change and the cache is not invalidated.

**How to avoid:**
Property switch must trigger a full cache invalidation: `queryClient.invalidateQueries()` scoped to all property-dependent keys, or `queryClient.clear()` entirely. The switch UI should navigate to a fresh route entry (force remount) rather than updating state in place. Add `propertyId` to every query key that touches property-scoped data — verify this is already the case, as it appears to be, but confirm the switch operation flushes these.

**Warning signs:**
- Multi-property switching updates a context variable but does not call `queryClient.invalidateQueries()`
- A component uses a stale closure over `propertyId` rather than reading it from URL params on each render
- Switching properties shows a brief flash of old data before the new data loads

**Phase to address:** P0 — Security and Access Control (the switching mechanism itself)

---

### Pitfall 8: SLA Timers Count Calendar Hours, Not Business Hours, and Breach on Weekends

**What goes wrong:**
An SLA of "48 hours to respond" is configured. A work order submitted Friday at 5pm is counted as breached by Sunday at 5pm, before anyone is in the office on Monday. The landlord sees their entire queue as "overdue" every Monday morning because the system counted 48 continuous hours. Escalation emails fire over the weekend to no one, creating alert fatigue that causes landlords to ignore all escalation notifications.

**Why it happens:**
SLA deadline = `created_date + duration_ms` is the simplest possible implementation. Business hours logic requires a calendar model and feels out of scope for an MVP.

**How to avoid:**
If business hours are not in scope for the initial SLA implementation, the timer must either be paused on weekends or the SLA duration must be expressed in business days (e.g., "2 business days") rather than hours. Do not ship a "48 hour SLA" that counts weekends without making the business-hours behavior explicit to landlords.

**Warning signs:**
- SLA deadline is computed as a simple timestamp addition with no weekend/holiday awareness
- The escalation rule fires at any hour including midnight and weekends
- SLA targets are defined in hours but the product assumes a 9-5 M-F workflow

**Phase to address:** P1 — SLA Tracking and Escalation

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Copy-paste sessionStorage check into each new page | Faster to ship | Any new landlord page added without the check is unguarded; inconsistent guard logic is hard to audit | Never — use a shared `<LandlordRoute>` wrapper |
| Update Invoice status on client after Stripe confirmPayment | Simpler code, no webhook endpoint needed | Payment state diverges on delayed failures, refunds, or disputes | Never for financial state |
| Skip SPF/DKIM on transactional email for initial send | Can test faster | First production batch goes to spam; reputation damage persists | Never — DNS setup must precede first production send |
| Store landlord_code in plain text in the Property entity | Simple to implement | Any authenticated user who can list Properties can read all landlord codes | Acceptable only if Base44 entity-level ACLs can restrict the field; otherwise, migrate off this pattern entirely |
| Add audit trail as a new entity with no backfill | Feature ships quickly | Historical coverage gap; "looks done" but isn't | Acceptable only if the coverage boundary is clearly communicated in the UI |
| SLA timers in calendar hours only | Simple timestamp math | Weekend breaches, alert fatigue, landlord trust erosion | Only acceptable if clearly labeled "calendar hours" and landlords are warned |
| 100% test coverage goal | Looks thorough | Tests implementation details instead of behavior; fragile to refactoring; false confidence | Never target 100% — target critical paths only |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Stripe | Updating payment state on client after `confirmPayment()` resolves | Treat client response as provisional; webhook event is the authoritative state update |
| Stripe | Using test API keys in the staging deploy, then forgetting to swap for production | Separate environment variables per deploy target; test key should never appear in a production-pointing `.env` |
| Stripe | Not validating webhook signatures | Always verify `stripe-signature` header with the webhook secret; reject unsigned payloads |
| Transactional email | Sending from a fresh domain with no SPF/DKIM | Configure DNS authentication before first production send; use a dedicated sending subdomain |
| Transactional email | Using the same sending domain for marketing and transactional email | Separate domains or subdomains isolate reputation — a marketing campaign bounce surge should not affect invoice delivery |
| Transactional email | No bounce/complaint monitoring configured at launch | Set up bounce webhooks and complaint rate alerts before first send; Gmail and Yahoo reject senders above 0.1% complaint rate |
| Base44 BaaS | Assuming `requiresAuth: false` client config is a deliberate security decision | Verify what server-side access rules exist on each entity; client config controls redirects, not data access |
| Base44 BaaS | Relying on client-side role checks as the security boundary | Any access rule that exists only in React component logic is bypassable; server-side ACLs or function layer required |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Audit trail writes on every mutation (no batching) | Write latency spikes on high-frequency operations; accounting page feels slow when saving records | Write audit events asynchronously or batch them; never block the primary mutation on the audit write | ~100 concurrent users |
| Loading all Notifications for a property without pagination | Notification bell takes 3-5 seconds to open for active properties | Add `limit` to Notification queries; paginate or use cursor-based loading | Properties with 50+ active tenants over 6+ months |
| SLA escalation check as a scheduled full-table scan | Escalation runs slowly; duplicate escalation emails sent | Use indexed `due_date` + `status` filter; track `last_escalated_at` to prevent re-fire | ~500 open requests |
| Financial report calculations done client-side over full unfiltered dataset | Reports page is slow; browser tab freezes on large properties | Add date-range filters to all financial queries; never load full history just to compute a month's summary | Properties with 2+ years of data |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| `landlord_code` stored in plain text on the Property entity, accessible to any authenticated user who can list properties | Any tenant who queries the Property list and inspects the response can retrieve the landlord code and access all landlord routes | Restrict the `landlord_code` field via Base44 entity-level ACLs or remove it from the entity once proper role-based auth is in place |
| Accounting routes (`/Accounting`, `/LandlordRequests`) have no session guard | Unauthenticated financial data access by anyone who knows a valid `propertyId` | Add `<LandlordRoute>` guard to all landlord routes in `App.jsx`; verify in P0 |
| `propertyId` in URL trusted as the authorization boundary | A user can substitute any `propertyId` and read that property's data | Server-side ownership enforcement via Base44 ACLs or a function layer that validates the requesting user owns the target property |
| Multi-property switch does not invalidate previous tenant's session data | Residual data from Property A may appear in Property B context (cache, localStorage) | Full cache flush + session context reset on every property switch |
| Email notification templates include sensitive data (tenant email, lease amount) sent in plaintext | Email interception or misconfigured reply-to exposes PII and financial data | Limit email content to event type and a link back to the authenticated app; do not embed financial figures in email body |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Auth migration silently redirects landlords to a new login flow without explanation | Landlords think the app is broken; support requests spike | Show a clear message explaining the auth change with contact info; do not silently redirect to a blank code input |
| Audit trail UI shows an empty state for all historical records with no date boundary explanation | Landlords think audit logging is broken or data was lost | Display "Audit history tracked from [migration date]" prominently; an honest boundary is better than a confusing empty state |
| SLA breach notifications fire at 2am on Saturday | Landlords learn to ignore all escalation notifications | Respect business hours for notification delivery or batch into a morning digest |
| Multi-property switching via a dropdown with no confirmation step | Landlord accidentally switches mid-workflow (e.g., while editing an invoice), loses context | Confirm switch if there are unsaved changes; show current property clearly in persistent header |
| Test suite counts coverage lines but tests pass regardless of behavior | Developers trust coverage report that doesn't detect regressions | Use behavioral tests (what the user sees/does) not implementation tests (internal state); coverage is a secondary metric |

---

## "Looks Done But Isn't" Checklist

Features that appear complete but are missing critical pieces.

- [ ] **Auth hardening:** Guard exists on LandlordDashboard — verify Accounting and LandlordRequests also have server-validated guards, not just sessionStorage checks
- [ ] **Audit trail:** AuditEvent writes on new mutations — verify the coverage boundary is labeled in the UI and historical records are not presented as having history they don't have
- [ ] **Stripe integration:** Payment flow works in test mode — verify webhook endpoint receives and processes events before declaring production-ready
- [ ] **Email notifications:** Emails deliver in staging — verify SPF/DKIM DNS records are live, sending domain has reputation, and bounce monitoring is active before production send
- [ ] **Multi-property switching:** UI allows switching — verify TanStack Query cache is fully invalidated and no Property A data bleeds into Property B views
- [ ] **SLA tracking:** Deadlines display correctly — verify weekends/business hours behavior is intentional and documented; verify escalation does not re-fire on already-escalated requests
- [ ] **Test suite:** Tests pass — verify tests assert behavior (what the user sees) not implementation (internal state); verify critical paths (auth guard, payment flow, request status change) are covered
- [ ] **landlord_code field:** Auth migrated to user roles — verify the `landlord_code` field on Property is either removed or access-restricted; it should not remain readable by tenant users

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Unguarded accounting route discovered post-launch | MEDIUM | Add `<LandlordRoute>` guard and deploy immediately; audit Base44 access logs if available to check for unauthorized reads; notify affected landlords if breach is confirmed |
| Stripe payment state desync (client says paid, Stripe says failed) | HIGH | Add a reconciliation script that queries Stripe PaymentIntent status for all invoices in `processing` state and corrects local status; implement webhook going forward; notify affected tenants |
| Email campaign goes to spam due to missing DNS auth | MEDIUM | Configure SPF/DKIM immediately; request re-evaluation from Postmaster Tools; wait for reputation recovery (days to weeks); do not send more email during reputation repair |
| SLA timers wrong due to calendar-hours logic | LOW | Update deadline calculation to use business-day arithmetic; recompute `sla_due_date` for all open requests; no data loss, just recalculation |
| Multi-property cache contamination causes wrong data display | LOW | `queryClient.clear()` on property switch is the fix; contamination is a display bug not a data mutation bug |
| Audit trail has gaps | HIGH (if audit is relied on for disputes) | Gaps in history cannot be retroactively filled accurately; only mitigation is clear documentation of coverage boundary; add a note to affected records if dispute arises |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Unguarded landlord routes (Accounting, Requests) | P0 — Security and Access Control | Load `/Accounting?propertyId=<any_id>` without a valid session; confirm redirect to login |
| `landlord_code` readable by tenants | P0 — Security and Access Control | Inspect Property entity response as an authenticated tenant user; confirm `landlord_code` field is absent or null |
| propertyId URL substitution (cross-tenant data read) | P0 — Security and Access Control | Test with a valid session for Property A, substitute Property B's `propertyId` in URL; confirm data is not returned |
| Auth migration session disruption | P0 — Security and Access Control | Deploy migration to staging; verify existing code-based sessions produce a clear message not a silent redirect |
| Multi-property cache contamination | P0 — Security and Access Control | Switch properties in one session; verify Property A data does not appear in Property B views |
| Audit trail coverage boundary | P0 — Security and Access Control | Ship audit writer; verify UI labels the start date; verify pre-migration records show no false history |
| Stripe webhook as authoritative state | P2 — Stripe Integration | Simulate `payment_intent.payment_failed` webhook after a successful client confirmation; verify invoice status updates to `failed` |
| Stripe test/production key mismatch | P2 — Stripe Integration | Add environment variable assertion in app startup; confirm production build fails fast if test key is detected |
| Email DNS authentication | P1 — Email Notifications | Use MXToolbox or mail-tester.com to verify SPF/DKIM before first production send |
| Email notification rate limiting | P1 — Email Notifications | Simulate a burst of 50 new posts on a property; confirm notification fan-out does not hit sending service rate limit |
| SLA calendar vs business hours | P1 — SLA Tracking | Create a request on Friday 5pm; verify SLA deadline is not breached by Sunday 5pm |
| SLA escalation loop | P1 — SLA Tracking | Let a request breach SLA; verify escalation fires exactly once per escalation tier, not on every evaluation cycle |
| TanStack Query cache contamination on property switch | P0 — Security and Access Control | Manual test: switch properties, inspect network tab to confirm all queries re-fetched with new propertyId |
| Test suite testing implementation not behavior | P2 — Quality and Polish | Code review: confirm tests assert rendered output or user interactions, not component internal state |

---

## Sources

- Auth0 Community — role-based authorization in React SPA best practices: https://community.auth0.com/t/best-practice-for-role-based-or-permission-based-authorization-in-a-react-spa/194364
- MoldStud — common Stripe developer mistakes: https://moldstud.com/articles/p-common-mistakes-developers-make-when-using-stripe-payment-processing-avoid-these-pitfalls
- Stigg Blog — Stripe webhooks best practices: https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks
- Postmark — transactional email best practices 2026: https://postmarkapp.com/guides/transactional-email-best-practices
- Mailgun — State of Email Deliverability 2025: https://www.mailgun.com/blog/deliverability/state-of-deliverability-takeaways/
- InstaTunnel — multi-tenant RLS failure patterns: https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c
- OWASP Multi-Tenant Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html
- Unito — SLA escalation workflow design: https://unito.io/blog/sla-aware-ticket-escalation-workflows/
- BlackSheepCode — getting started testing an untested React codebase: https://blacksheepcode.com/posts/how_to_get_started_testing
- Valentinog — 5 tips for untested React codebases: https://www.valentinog.com/blog/untested-react/
- Stripe documentation — idempotent requests: https://docs.stripe.com/api/idempotent_requests
- Frontegg — SaaS multitenancy security best practices: https://frontegg.com/blog/saas-multitenancy
- Direct code inspection: `src/pages/LandlordLogin.jsx`, `src/pages/LandlordDashboard.jsx`, `src/pages/Accounting.jsx`, `src/pages/LandlordRequests.jsx`

---
*Pitfalls research for: UNIT — multi-tenant property community SaaS gap closure milestone*
*Researched: 2026-03-25*
