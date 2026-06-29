import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

// Security headers applied by Next itself, so they hold on ANY host (Vercel,
// AWS, self-managed Node) — not only where vercel.json is honored.
//
// CSP is now ENFORCED (was report-only). It blocks external script injection,
// clickjacking (frame-ancestors), form hijacking (form-action), base-tag
// rewrites (base-uri), plugins (object-src), and constrains connect/img/font
// origins. `'unsafe-inline'` is intentionally retained on script-src/style-src:
// Next.js App Router + Sentry inject inline bootstrap scripts, and dropping
// unsafe-inline requires per-request nonce propagation through middleware,
// which must be smoke-tested against a real deploy before shipping. That strict
// (nonce-based, no unsafe-inline) hardening is the documented follow-up; see
// docs/security/csp-strict-nonce.md. Residual inline-XSS risk is mitigated by
// React auto-escaping and http(s)-only validation on all user-supplied URLs.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "frame-src https://js.stripe.com https://checkout.stripe.com",
  "connect-src 'self' https://*.supabase.co https://*.ingest.sentry.io https://api.stripe.com",
  "img-src 'self' https://*.supabase.co data: blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: CSP },
]

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
})
