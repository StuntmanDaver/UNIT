# Stack Research

**Domain:** Property management React SPA — gap closure (security hardening, payment, email, QR, testing, SLA)
**Researched:** 2026-03-25
**Confidence:** HIGH for all six areas (verified against official docs and npm registry)

---

## Scope of This Research

This file does NOT re-document the existing stack (React 18, Vite, Tailwind, shadcn/ui, TanStack Query, Base44 SDK — all confirmed in `.planning/codebase/STACK.md`). It covers only the **net-new libraries** needed to close the P0/P1/P2 gaps:

1. Auth hardening — Base44 server-side role validation
2. Stripe payment integration
3. Email notifications
4. Standards-compliant QR generation
5. Automated testing
6. SLA tracking and assignment workflows

---

## Recommended Stack

### 1. Auth Hardening — Base44 Native Role System

No new npm packages required. All auth hardening is done inside Base44 platform configuration + existing SDK.

**What Base44 provides (verified against official docs):**

| Mechanism | What it does | How to use |
|-----------|-------------|------------|
| User entity `role` field | Built-in field. Values: `"admin"` or `"user"`. Cannot be redefined. | Promote landlord accounts to `admin` via Dashboard → Users |
| Row Level Security (RLS) | `create`/`read`/`update`/`delete` rules enforced server-side on every entity | Add `{"user_condition": {"role": "admin"}}` to landlord-only entities |
| Field Level Security (FLS) | Per-field `read`/`write` rules | Lock financial fields to admin-only writes |
| Backend functions | Deno TypeScript functions invoked with `base44.functions.invoke()`. Auth injected automatically. Cannot be bypassed client-side. | Wrap any mutating landlord operation in a backend function that verifies `user.role === "admin"` |

**Why this approach:**
The existing landlord auth stores `landlord_property_id` in `sessionStorage` — a client-only check that any browser user can forge. Base44 RLS rules execute inside the platform's data layer before returning data. A client cannot bypass them by removing localStorage values.

**What to build (not what to install):**
- Promote landlord user accounts to `admin` role in Base44 Dashboard
- Add `{"user_condition": {"role": "admin"}}` RLS rules to Lease, RecurringPayment, Invoice, Expense, Payment entities
- Add a backend function `verifyLandlordAccess(propertyId)` that checks `user.role === "admin"` and that the user is linked to the requested property
- Replace `sessionStorage.landlord_property_id` session pattern with a call to this function on every landlord page mount
- Multi-property switching: store an array of `property_ids` in a custom `landlord_properties` field on the User entity; the active property is UI state, not auth state

**Confidence: HIGH** — Verified against `https://docs.base44.com/developers/backend/resources/entities/security` and `https://docs.base44.com/Setting-up-your-app/Managing-access`

---

### 2. Stripe Payment Integration

**Already in package.json — needs version upgrade and wiring, not fresh installation.**

| Package | Current in package.json | Required version | Why upgrade |
|---------|------------------------|-----------------|-------------|
| `@stripe/react-stripe-js` | `^3.0.0` | `^5.6.1` | v5 requires `@stripe/stripe-js` >=8.0.0; current v3 is incompatible with latest stripe-js |
| `@stripe/stripe-js` | `^5.2.0` | `^8.11.0` | v8 is the version required by react-stripe-js v5 |

**For Base44 backend functions (Deno runtime), use the Stripe npm package via CDN import:**

```typescript
// In Base44 backend function (Deno TypeScript)
import Stripe from "npm:stripe@17";
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: "2026-01-28",
});
```

No npm install for `stripe` server-side — the Deno runtime imports it at function execution time. Store `STRIPE_SECRET_KEY` as a Base44 Secret (Dashboard → Code → Secrets).

**Architecture for this BaaS constraint:**
Stripe requires a server-side step to create PaymentIntents (secret key must never reach the browser). Base44 backend functions fill this role:

```
Frontend (React)
  → base44.functions.invoke("createPaymentIntent", { invoiceId, amount })
  → Deno function creates Stripe PaymentIntent with secret key
  → Returns { clientSecret }
Frontend confirms payment with @stripe/react-stripe-js PaymentElement
  → Stripe webhook fires to Base44 webhook endpoint
  → Deno webhook handler updates Invoice.status = "paid"
```

**Important Base44 limitation (MEDIUM confidence):** Base44 webhooks only fire while users are actively using the app — they are not always-on background workers. Automated subscription renewals or retry logic at arbitrary times will not work. For this project (manual invoice payments), this is acceptable.

**Confidence: HIGH** — Stripe versions verified against `https://github.com/stripe/react-stripe-js/releases`. Architecture pattern confirmed by `https://docs.base44.com/developers/backend/resources/backend-functions/overview` and `https://base44.com/blog/base44-stripe-integration`.

---

### 3. Email Notifications

**Resend is the recommended provider because Base44 has a native Resend integration.**

| Package | Version | Where installed | Purpose |
|---------|---------|----------------|---------|
| `resend` | `^6.9.4` | NOT in package.json — imported in Base44 Deno backend functions via `npm:resend@6` | Email sending SDK |
| `@react-email/components` | `^1.0.10` | dev dependency (`npm install -D @react-email/components`) | Build HTML email templates as React components, render to string |
| `@react-email/render` | `^2.0.4` | dev dependency | Render React email components to HTML string for Resend payload |

**Why Resend over alternatives:**
- Base44 has a documented first-party integration with Resend (vs. manual SMTP/SendGrid wiring)
- Setup path: Base44 Dashboard → add Resend integration → paste `RESEND_API_KEY` as Secret → done
- No custom SMTP configuration; API key stored in Base44 Secrets (never in frontend code)
- `react-email` (by the same team as Resend) produces well-rendered HTML email templates

**Why NOT Nodemailer:** Requires SMTP server configuration and has no Base44-native integration. Adds unnecessary complexity for this project.

**Why NOT SendGrid/Mailgun:** No Base44-native integration path. Requires fully manual Deno backend function wiring.

**Architecture:**
```
Frontend event (e.g. recommendation status change)
  → base44.functions.invoke("sendNotificationEmail", { recipientEmail, type, payload })
  → Deno function uses Resend SDK with RESEND_API_KEY from Secrets
  → Sends HTML email rendered from @react-email template
```

React Email templates are authored as `.tsx` files and rendered server-side in the Deno function using `@react-email/render`. They do NOT ship to the browser bundle.

**Confidence: HIGH** — Resend Base44 integration verified at `https://resend.com/docs/knowledge-base/base44-integration`. Package versions from npm registry (March 2026).

---

### 4. Standards-Compliant QR Code Generation

**`qrcode` (v1.5.4) is already in package.json. Add `qrcode.react` as the React wrapper.**

| Package | Version | Installation | Purpose |
|---------|---------|-------------|---------|
| `qrcode.react` | `^4.2.0` | `npm install qrcode.react` | React component wrapping the `qrcode` library; outputs SVG or Canvas |
| `qrcode` | `^1.5.4` | already installed | Standards-compliant ISO 18004 QR generation engine |

**Why `qrcode.react` over alternatives:**

| Option | Verdict | Reason |
|--------|---------|--------|
| `qrcode.react` v4.2.0 | **Use this** | Uses the same `qrcode` engine already in package.json; outputs proper SVG (scalable, no blurriness); React 18 compatible; ref support for canvas export |
| `react-qr-code` v2.0.18 | Skip | Different encoding library; adds redundancy since `qrcode` is already installed |
| Manual `qrcode` canvas render | Skip | More boilerplate; `qrcode.react` wraps it cleanly and handles responsive scaling |

**What "standards-compliant" means here:** The existing pseudo-QR (built with `html2canvas` visual patterns or manual grid rendering) does not produce scannable ISO 18004 QR codes. `qrcode.react` uses the `qrcode` library under the hood, which encodes data per the QR Code 2005 standard (ISO/IEC 18004:2006). Any QR scanner app will read it correctly.

**Usage pattern:**
```jsx
import { QRCodeSVG } from "qrcode.react";
// Render in MyCard / Profile sharing
<QRCodeSVG value={profileUrl} size={200} level="M" />
```

Use `QRCodeSVG` not `QRCodeCanvas` — SVG scales cleanly for mobile and print, Canvas blurs at non-native sizes.

**Confidence: HIGH** — `qrcode.react` v4.2.0 confirmed on npm. ISO 18004 compliance verified through qrcode library documentation.

---

### 5. Automated Testing

**Full test stack — all dev dependencies.**

| Package | Version | Installation | Purpose |
|---------|---------|-------------|---------|
| `vitest` | `^4.1.1` | `npm install -D vitest` | Test runner. Reuses existing Vite config; no separate babel/jest config needed |
| `@testing-library/react` | `^16.3.2` | `npm install -D @testing-library/react` | Component rendering and querying in tests |
| `@testing-library/user-event` | `^14.6.1` | `npm install -D @testing-library/user-event` | Simulates real user interactions (click, type, etc.) |
| `@testing-library/jest-dom` | `^6.9.1` | `npm install -D @testing-library/jest-dom` | Custom matchers: `toBeInTheDocument()`, `toHaveValue()`, etc. |
| `jsdom` | latest | `npm install -D jsdom` | DOM simulation environment for Vitest (installed separately; vitest treats it as optional peer dep) |

**Why Vitest over Jest:**
- Vitest v4 reuses the existing `vite.config.js` — no second build config to maintain
- Significantly faster test execution (parallel by default, uses Vite's transformation pipeline)
- Jest-compatible API — matchers, mocks, and describe/it/expect all work the same
- No Babel configuration required (Jest requires Babel for JSX in non-CRA projects)

**Why NOT Playwright/Cypress for initial test suite:** This project has zero tests. Start with unit/integration tests for critical business logic (auth guards, SLA deadlines, form submissions). E2E tools are appropriate in a later phase once coverage baseline exists.

**Required `vite.config.js` additions:**
```js
// Add to existing vite.config.js
export default defineConfig({
  // ... existing config ...
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
  },
});
```

**`src/test/setup.js`:**
```js
import "@testing-library/jest-dom/vitest";
```

**Critical paths to test first:**
1. Auth guard components (landlord route protection)
2. SLA deadline calculation utilities
3. Invoice status state machine
4. QR code rendering (does it mount without crashing)
5. Form validation (React Hook Form + Zod schemas)

**Confidence: HIGH** — Vitest v4.1.1 confirmed on npm (March 2026). All @testing-library versions confirmed on npm. Setup pattern verified across multiple 2026 guides.

---

### 6. SLA Tracking and Assignment Workflows

**No new libraries required.** All needed packages are already installed.

| Need | Existing package | How to use |
|------|-----------------|-----------|
| SLA deadline calculation | `date-fns` v3.6.0 | `addBusinessDays()`, `differenceInHours()`, `isPast()` for due-date logic |
| Assignment drag-drop (if needed) | `@hello-pangea/dnd` v17.0.0 | Already installed; drag Recommendation cards to assignee columns |
| Real-time status polling | `@tanstack/react-query` v5.84.1 | `refetchInterval` on recommendation queries to surface overdue items |
| Priority/status display | `lucide-react` + `shadcn/ui` badges | Already installed; use `Badge` variants for priority levels |
| Date display/formatting | `date-fns` v3.6.0 | `formatDistance()` for "2 hours overdue" messaging |

**What to build (data model additions, not library additions):**
- Add `sla_hours` field to `Recommendation` entity (e.g., `24` for issues, `72` for enhancements)
- Add `assigned_to` field (email string, references a landlord user)
- Add `due_date` computed field (set on status transition to `in_progress`)
- Add `escalated` boolean field (set by a backend function cron if Base44 supports it; otherwise set on page load when `due_date < now`)
- Frontend: SLA status indicator component using `differenceInHours(dueDate, now)` and color-coded `Badge`

**Why no dedicated SLA library:** SLA tracking at this scale (property management requests, not enterprise ITIL) is essentially date arithmetic + status state machines. The existing `date-fns` handles all calculations. A dedicated library (e.g., `sla-manager`, `node-sla`) adds dependency weight for logic that is 30 lines of code.

**Confidence: HIGH** — No new packages means no version uncertainty. date-fns v3 API verified.

---

## Installation Commands

```bash
# Stripe — upgrade existing packages to compatible versions
npm install @stripe/react-stripe-js@^5.6.1 @stripe/stripe-js@^8.11.0

# QR code React component (qrcode engine already installed)
npm install qrcode.react@^4.2.0

# Email templates (dev dep — only for authoring templates, not runtime)
npm install -D @react-email/components@^1.0.10 @react-email/render@^2.0.4

# Testing — all dev dependencies
npm install -D vitest@^4.1.1 @testing-library/react@^16.3.2 @testing-library/user-event@^14.6.1 @testing-library/jest-dom@^6.9.1 jsdom
```

**No install needed for:**
- Auth hardening (Base44 platform configuration + existing SDK)
- Email sending runtime (`resend` imported in Deno backend functions, not bundled)
- SLA tracking (all existing packages)

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Base44 native RLS + role field | Custom JWT middleware | Base44 is a BaaS; adding a custom auth server violates the constraint to stay within the Base44 ecosystem and doubles the infra surface |
| Resend (Base44 native integration) | SendGrid / Mailgun | No Base44-native integration; requires fully manual Deno wiring. Resend setup is documented and tested by Base44 team. |
| Resend (Base44 native integration) | Nodemailer | Nodemailer is SMTP-based; requires an external SMTP relay and has no Base44 integration path |
| `qrcode.react` | `react-qr-code` | `qrcode` is already installed; `qrcode.react` wraps the same engine. Adding `react-qr-code` would introduce a second QR encoding library |
| Vitest | Jest | Jest requires Babel for JSX in Vite projects. Vitest reuses the existing `vite.config.js` with zero extra config. API is identical so migration cost is zero |
| Vitest | Playwright/Cypress (E2E) | No existing tests exist. Start with unit/integration coverage before adding E2E overhead. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `sessionStorage` for landlord auth | Client-side only; trivially bypassed by any user opening DevTools | Base44 RLS rules with `user.role === "admin"` condition |
| `html2canvas` for QR generation | Produces a screenshot of styled HTML, not a standards-compliant QR code. Scanners may not read it. | `qrcode.react` with `QRCodeSVG` |
| `stripe` npm package in frontend code | Exposes secret key in browser bundle | Import via `npm:stripe@17` in Base44 Deno backend functions only |
| `nodemailer` | Requires SMTP relay; no Base44 integration path; API key management is manual | `resend` via Base44's native Resend integration |
| Jest | Requires Babel config to handle JSX in a Vite project; slower than Vitest | Vitest (identical API, zero Vite config duplication) |
| `moment` for SLA date math | Already flagged as legacy in codebase; inconsistent to add new moment usage | `date-fns` v3 (already installed, tree-shakeable) |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|----------------|-------|
| `@stripe/react-stripe-js@^5.6.1` | `@stripe/stripe-js@>=8.0.0 <9.0.0` | Must upgrade both together; current v3/v5 pairing in package.json is mismatched with v5 react package |
| `vitest@^4.1.1` | Vite 6.x | Vitest 4.x is designed for Vite 5+/6; no config changes needed beyond adding `test` block |
| `@testing-library/react@^16.3.2` | React 18.x | RTL v16 requires `@testing-library/dom` as peer dep — install alongside |
| `qrcode.react@^4.2.0` | `qrcode@^1.5.4` | qrcode.react wraps the qrcode package; both must be present. qrcode 1.5.4 is already installed. |
| `@react-email/render@^2.0.4` | React 18.x | Used only in Deno backend context for rendering; not bundled to browser |

---

## Sources

- `https://docs.base44.com/developers/backend/resources/entities/security` — RLS/FLS syntax, user_condition rules (HIGH confidence)
- `https://docs.base44.com/Setting-up-your-app/Managing-access` — Admin vs User role distinction (HIGH confidence)
- `https://docs.base44.com/developers/backend/resources/entities/user-schema` — Built-in User fields, role field constraint (HIGH confidence)
- `https://docs.base44.com/developers/backend/resources/backend-functions/overview` — Deno runtime, `base44.functions.invoke()` pattern (HIGH confidence)
- `https://resend.com/docs/knowledge-base/base44-integration` — Native Resend + Base44 integration setup (HIGH confidence)
- `https://github.com/stripe/react-stripe-js/releases` — v5.6.1 confirmed latest (HIGH confidence)
- `https://www.npmjs.com/package/@stripe/stripe-js` — v8.11.0 confirmed latest (HIGH confidence)
- `https://www.npmjs.com/package/qrcode.react` — v4.2.0 confirmed (MEDIUM confidence — last published ~1 year ago, but stable)
- `https://www.npmjs.com/package/vitest` — v4.1.1 confirmed latest (HIGH confidence)
- `https://www.npmjs.com/package/@testing-library/react` — v16.3.2 confirmed latest (HIGH confidence)
- `https://www.npmjs.com/package/@testing-library/user-event` — v14.6.1 confirmed latest (HIGH confidence)
- `https://www.npmjs.com/package/@testing-library/jest-dom` — v6.9.1 confirmed latest (HIGH confidence)
- `https://www.npmjs.com/package/resend` — v6.9.4 confirmed latest (HIGH confidence)
- `https://www.npmjs.com/package/@react-email/components` — v1.0.10 confirmed (HIGH confidence)

---

*Stack research for: UNIT property community SaaS — gap closure milestone*
*Researched: 2026-03-25*
