# Payment Success — Dual-Reconciliation Design

## Overview

The promotion payment flow uses two independent reconciliation paths so that
`promotions.payment_status` always transitions to `paid` even if the user's
browser never loads the success page.

```
Stripe Checkout ──────────────────────────────────────────────────────────┐
                                                                           │
  ┌─ checkout.session.completed event ─────────────────────────────────┐  │
  │  POST /api/webhooks/stripe                                          │  │
  │  • Runs server-side regardless of browser state                     │  │
  │  • Signature-verified (STRIPE_WEBHOOK_SECRET)                       │  │
  │  • Idempotent via stripe_webhook_events.completed_at guard          │  │
  │  • Updates promotions, promotion_payment_attempts,                  │  │
  │    promotion_status_events, and sends admin push/notification       │  │
  └─────────────────────────────────────────────────────────────────────┘  │
                                                                           │
  ┌─ success_url redirect ─────────────────────────────────────────────┐  │
  │  GET /success?session_id=<cs_...>                                   │  │
  │  • Auth-gated by middleware; unauthed → 307 /login (see below)      │  │
  │  • Calls stripe.checkout.sessions.retrieve() via service-role       │  │
  │  • Only mutates DB if payment_status !== 'paid' (webhook-beat guard)│  │
  │  • Writes actor_type='system', note='Reconciled by success page'    │  │
  └─────────────────────────────────────────────────────────────────────┘  │
                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

## Primary path: webhook

`portal/app/api/webhooks/stripe/route.ts` is the authoritative reconciliation
surface. It fires for every completed checkout regardless of browser state.

Key properties:
- Stripe retries delivery for up to 3 days on non-2xx responses
- Idempotency: the handler first inserts a row into `stripe_webhook_events`
  (claim), then checks `completed_at IS NULL` before running mutations
  (process-then-mark pattern from migration
  `20260505000001_stripe_webhook_events_completed_at`)
- Also handles `checkout.session.expired` (flips attempt → `failed`) and
  `payment_intent.payment_failed` (audit-only, routed via `metadata.promotionId`)

## Fallback path: /success page

`portal/app/(portal)/success/page.tsx` is a stateless fallback. It runs only
when an authenticated user's browser reaches the success URL after completing
checkout. It guards against double-write:

```typescript
if (currentPromo && currentPromo.payment_status !== 'paid') {
  // webhook hasn't arrived yet — reconcile now
}
```

If the webhook already ran, this branch is skipped entirely and the page
renders the confirmation card in "already paid" state.

## Edge cases

### Unauthed direct hit to /success

Middleware redirects to `/login?session_id=<cs_...>`. The `session_id` is
preserved so the user can log in and be redirected back (though the portal
does not currently implement that return redirect automatically — it falls
through to dashboard). The promotion is still correctly marked paid by the
webhook regardless.

**Why this is acceptable:** The webhook is always the primary. The success page
is purely a UX confirmation surface. Even if the user never sees it, the
database is consistent.

### Webhook arrives before the success page loads

The `payment_status !== 'paid'` guard on the success page short-circuits.
No double-write occurs. The confirmation card renders based on the Stripe
session object (`payment_status === 'paid'` from Stripe API), not from the
database — so it always shows correctly.

### Network failure prevents webhook delivery

Stripe retries with exponential backoff for up to 3 days. If delivery fails
entirely, the next time an authed user navigates to `/success?session_id=...`,
the fallback path will reconcile. This is an extreme edge case — the endpoint
is deployed on Vercel Edge and has sub-second response times.

## Verification history

| Date | Test | Result |
|---|---|---|
| 2026-05-05 | Stripe-signed E2E — `evt_1TTfCQ5KlDoarTR95ZzUZlN1` | PASS: webhook delivered, all DB mutations confirmed, `pending_webhooks=0` |
| 2026-05-05 | Idempotency replay — same event resent | PASS: `completed_at` unchanged, no duplicate rows |
| 2026-05-05 | `/success` unauthed hit | PASS: 307 → /login with session_id preserved |

## Related files

- `portal/app/api/webhooks/stripe/route.ts` — webhook handler
- `portal/app/(portal)/success/page.tsx` — success page fallback
- `portal/app/api/checkout/route.ts` — creates Stripe Checkout Session
- `supabase/migrations/20260505000001_stripe_webhook_events_completed_at.sql` — idempotency column
- `unit/supabase/functions/create-promotion-checkout-session/index.ts` — mobile Edge Function (same webhook, different caller)
