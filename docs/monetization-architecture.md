# Monetization Architecture

This document describes the monetization extension points baked into UNIT's current architecture. No monetization features are implemented yet — this is a reference for the developer who adds them, per design spec Section 13.

The existing schema was built with commercial intent. The hooks described here require additive changes only; no existing tables need restructuring.

---

## Current Architecture Hooks

The following hooks exist in the live schema today:

### Advertiser Promotions — Approval Workflow

Table: `advertiser_promotions`

The table already has an `is_approved` boolean and an admin approval flow. This is the highest-readiness monetization hook: insert a payment step between submission and approval.

Flow today:
> Advertiser submits → Admin reviews → Admin approves → Promotion goes live

Target flow:
> Advertiser submits → **Stripe Checkout** → Payment confirmed → Admin reviews → Admin approves → Promotion goes live

The approval action already exists as an admin UI gesture; it just needs to gate on `stripe_payment_id IS NOT NULL` before becoming available.

### Posts Table — Sponsored Boost

Table: `posts`

Tenants post community content today at no cost. A `is_sponsored` boolean (not yet added) would mark posts that have paid for elevated placement in the feed — rendered above organic posts, with a "Sponsored" badge.

### Businesses Table — Premium Profiles

Table: `businesses`

All businesses currently have equivalent profile presentation. A `tier` column (not yet added) would distinguish free vs. premium listings — premium profiles could include additional media slots, featured placement in the directory, and contact detail visibility.

### CTA Link — Transaction Fees

Column: `advertiser_promotions.cta_link`

The promotion CTA link currently points to an external URL. An in-app redemption flow — where the deal is claimed, fulfilled, and tracked inside UNIT — creates a surface for transaction fees. This requires a redemption screen and a lightweight ledger, but the entry point (`cta_link`) is already in the schema.

### Properties Table — Subscription Billing

Table: `properties`

Each property currently exists without a billing tier. A `subscription_tier` column (not yet added) would allow per-property billing: basic (free), standard, and premium tiers with different feature limits (number of tenants, push notification volume, advertiser slots).

---

## Future Schema Extensions

These migrations are not implemented. They are illustrative of the minimal schema changes required:

```sql
-- Advertiser promotion payment tracking
ALTER TABLE advertiser_promotions ADD COLUMN placement_type text DEFAULT 'standard';
ALTER TABLE advertiser_promotions ADD COLUMN price_cents integer;
ALTER TABLE advertiser_promotions ADD COLUMN stripe_payment_id text;

-- Business Stripe customer linkage (for subscription or premium billing)
ALTER TABLE businesses ADD COLUMN stripe_customer_id text;

-- Sponsored posts
ALTER TABLE posts ADD COLUMN is_sponsored boolean DEFAULT false;

-- Property subscription tier
-- ALTER TABLE properties ADD COLUMN subscription_tier text DEFAULT 'free';

-- Full subscription table (if managing subscriptions server-side rather than via Stripe Billing)
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,          -- 'property' | 'business'
  entity_id uuid NOT NULL,
  stripe_subscription_id text,
  tier text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now()
);
```

Apply these in a new migration file (e.g. `008_monetization_schema.sql`) when the time comes.

---

## Revenue Models — Priority Order

These are ranked by implementation readiness, highest first.

| Priority | Model | Status |
|----------|-------|--------|
| 1 | Paid advertiser placements | Infrastructure in place — needs Stripe Checkout integration |
| 2 | Sponsored tenant posts | One column addition + feed ranking change |
| 3 | Premium business profiles | One column addition + UI differentiation |
| 4 | Transaction fees on deal redemptions | Requires in-app redemption flow |
| 5 | Property subscriptions | Requires Stripe Billing + entitlement enforcement |

---

## Integration Notes

- **Stripe:** All payment flows should use Stripe Checkout (hosted page) for PCI compliance. Server-side payment confirmation via Stripe webhooks, not client-side success callbacks.
- **Edge Functions:** Payment-related operations (create Checkout session, handle webhook, update `stripe_payment_id`) should live in new Edge Functions, following the same pattern as the existing ones in `supabase/functions/`.
- **RLS:** Any new columns tied to payment status (`is_sponsored`, `tier`, `subscription_tier`) must have corresponding RLS policies to prevent client-side manipulation.
