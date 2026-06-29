# Strict (nonce-based) CSP — hardening follow-up

## Current state (shipped)
`portal/next.config.ts` serves an **enforced** `Content-Security-Policy` that
retains `'unsafe-inline'` on `script-src` and `style-src`. This already blocks
external script injection, clickjacking (`frame-ancestors 'none'`), form
hijacking (`form-action 'self'`), base-tag rewrites (`base-uri 'self'`), plugins
(`object-src 'none'`), and constrains `connect-src`/`img-src`/`font-src`. The
residual gap is inline-script XSS, mitigated by React auto-escaping and
`http(s)`-only validation on every user-supplied URL.

## Target
Drop `'unsafe-inline'` from `script-src` by attaching a per-request nonce to
every first-party inline script, so injected inline `<script>` is refused.

## Why it's a separate, tested step
Next.js App Router and `@sentry/nextjs` inject inline bootstrap/hydration
scripts. With a nonce present, CSP3 browsers **ignore** `'unsafe-inline'`, so any
first-party inline script that doesn't carry the nonce is blocked — which breaks
hydration if propagation is incomplete. This must be verified on a real deploy
(Stripe.js checkout, Sentry capture, page hydration) before shipping.

## Implementation sketch (Next.js 15, App Router)
1. In `middleware.ts`, generate a nonce per request:
   ```ts
   const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
   const csp = [
     "default-src 'self'",
     `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com`,
     "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // styles can keep unsafe-inline
     "frame-src https://js.stripe.com https://checkout.stripe.com",
     "connect-src 'self' https://*.supabase.co https://*.ingest.sentry.io https://api.stripe.com",
     "img-src 'self' https://*.supabase.co data: blob:",
     "font-src https://fonts.gstatic.com",
     "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
   ].join('; ')
   ```
2. Pass the nonce to the app via a request header (`x-nonce`) and set the CSP on
   both the request and response headers (Next reads it to nonce its own
   scripts). Remove the static CSP from `next.config.ts` to avoid a double
   header.
3. Configure Sentry to use the nonce (`browserTracingIntegration` / loader
   `nonce` option) so its inline snippet is allowed.
4. Smoke test on a preview deploy: login, dashboard render, **Stripe checkout**,
   image render, and confirm zero CSP violations in the console + Sentry.

## Rollout
Ship as `Content-Security-Policy-Report-Only` (strict variant) alongside the
enforced baseline first, watch reports for a few days, then promote to enforced
and delete the `unsafe-inline` baseline.
