# Deployment Guide

This guide covers mobile, portal, Supabase, and webhook deployment.

## Environment Separation

Maintain separate values for staging and production.

| Surface | Staging | Production |
| --- | --- | --- |
| Supabase | Separate staging project | Separate production project |
| Stripe | Test mode | Live mode after launch signoff |
| Vercel | Preview/Staging env | Production env |
| EAS profile | `staging` | `production` |
| iOS bundle ID | `com.unitapp.mobile.staging` | `com.unitapp.mobile` |
| Android package | `com.unitapp.mobile.staging` | `com.unitapp.mobile` |
| URL scheme | `unit-staging` | `unit` |
| Stripe webhook | Staging portal URL | Production portal URL |

## Mobile Build

From `unit/`:

```bash
npm run release:check:staging
npm run release:staging:ios:build
npm run release:staging:android:build
```

Production:

```bash
npm run release:check
npm run release:ios:build
npm run release:android:build
```

Required EAS environment values:

- `APP_VARIANT`
- `EXPO_PUBLIC_ENV`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_APP_URL`
- `EXPO_PUBLIC_SENTRY_DSN`
- `EXPO_PUBLIC_SUPPORT_EMAIL`
- `SENTRY_DISABLE_AUTO_UPLOAD=true` for store builds
- Optional source-map upload only: `SENTRY_ENABLE_AUTO_UPLOAD`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`

## Portal Deploy

From `portal/`:

```bash
npm run release:check:staging
```

Deploy through Vercel after the check passes.

Required portal environment values:

- `NEXT_PUBLIC_ENV`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SENTRY_DSN`
- Optional source-map upload only: `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`

## Supabase Migrations

From `unit/`:

```bash
supabase link --project-ref <staging-ref>
supabase db push
npm run edge:check
```

Deploy active Edge Functions:

```bash
supabase functions deploy add-property-to-admin
supabase functions deploy complete-onboarding
supabase functions deploy create-promotion-checkout-session
supabase functions deploy delete-account
supabase functions deploy expire-promotions
supabase functions deploy invite-tenant
supabase functions deploy issue-refund
supabase functions deploy send-push-notification
```

Set Edge Function secrets per environment:

```bash
supabase secrets set STRIPE_SECRET_KEY=<value>
supabase secrets set MOBILE_APP_URL=unit-staging://
supabase secrets set SENTRY_DSN=<value>
supabase secrets set APP_ENV=staging
supabase secrets set RESEND_API_KEY=<value>
supabase secrets set RESEND_FROM_EMAIL=<value>
```

Use `MOBILE_APP_URL=unit://` and `APP_ENV=production` for production.

## Stripe Webhook

Create one webhook endpoint per portal environment:

- Staging: `https://<staging-portal-domain>/api/webhooks/stripe`
- Production: `https://<production-portal-domain>/api/webhooks/stripe`

Subscribe to:

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.payment_failed`

After creating the endpoint, copy its `whsec_...` value into the matching Vercel environment.
