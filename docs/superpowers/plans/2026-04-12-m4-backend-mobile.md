# M4 Backend + Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the M4 monetization data model to the database, implement the `issue-refund` and `expire-promotions` Edge Functions, and update the mobile app with analytics recording, admin review workflow (4 actions), and admin dashboard revenue/engagement sections.

**Architecture:** One SQL migration renames `advertiser_promotions` → `promotions` and adds M4 columns; creates 5 new tables. Mobile service/hook layer is updated in the same commit as the migration so the table rename doesn't leave the app broken. Two Deno Edge Functions handle refund processing and nightly expiry. Analytics events are lightweight Supabase inserts with client-side dedup.

**Tech Stack:** PostgreSQL + Supabase RLS, Deno Edge Functions, Stripe REST API (in Edge Function), React Native 0.81, Expo SDK 54, TanStack React Query, NativeWind, victory-native@36 (charts)

**Deploy dependency:** Deploy this plan (DB migration + mobile update) together in a single release. The DB rename breaks the `advertiser_promotions` queries in the old app until the updated app ships.

---

## File Map

### Created
- `supabase/migrations/20260412000100_m4_monetization.sql`
- `supabase/functions/issue-refund/index.ts`
- `supabase/functions/expire-promotions/index.ts`
- `services/promotions.ts`
- `services/analytics.ts`
- `__tests__/services/promotions.test.ts`
- `__tests__/services/analytics.test.ts`
- `components/admin/ReviewNoteModal.tsx`
- `components/admin/RevenueChart.tsx`
- `components/admin/EngagementStats.tsx`

### Modified
- `services/admin.ts` — add `getRevenueStats`, update `getStats` for renamed table
- `services/advertiser-promotions.ts` — keep file, re-export from `promotions.ts` for backward compat
- `hooks/usePromotions.ts` — read from `promotions` table, new `review_status` column
- `hooks/useAdvertiserPromotions.ts` — update for new column names
- `app/(tabs)/promotions.tsx` — add analytics `recordView`/`recordTap` calls
- `app/(admin)/advertisers.tsx` — replace 2-button review with 4-button + note modal + suspend + refund
- `app/(admin)/index.tsx` — add revenue chart and engagement stats sections
- `__tests__/hooks/usePromotions.test.ts` — update for new schema

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260412000100_m4_monetization.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260412000100_m4_monetization.sql
-- M4 Monetization: renames advertiser_promotions → promotions, adds 5 new tables.
-- DEPLOY TOGETHER with the mobile app update in this plan.

BEGIN;

-- ============================================================
-- 1. advertiser_profiles (new — must come before promotions FK)
-- ============================================================
CREATE TABLE advertiser_profiles (
  id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name     text        NOT NULL,
  contact_email     text        NOT NULL,
  stripe_customer_id text,
  status            text        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','active','suspended')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE advertiser_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advertisers read own advertiser_profile"
  ON advertiser_profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Advertisers update own advertiser_profile"
  ON advertiser_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins manage advertiser_profiles"
  ON advertiser_profiles FOR ALL TO authenticated
  USING (is_landlord());

-- ============================================================
-- 2. Rename advertiser_promotions → promotions
-- ============================================================
ALTER TABLE advertiser_promotions RENAME TO promotions;

ALTER INDEX IF EXISTS idx_advertiser_promotions_property_status
  RENAME TO idx_promotions_property_approval_status;

DROP POLICY IF EXISTS "Tenants read approved advertiser promotions" ON promotions;
DROP POLICY IF EXISTS "Admins manage advertiser promotions" ON promotions;

-- ============================================================
-- 3. Add M4 columns to promotions
-- ============================================================
ALTER TABLE promotions
  ADD COLUMN IF NOT EXISTS advertiser_id             uuid
    REFERENCES advertiser_profiles(id),
  ADD COLUMN IF NOT EXISTS payment_status            text
    CHECK (payment_status IN ('unpaid','paid','repayment_required','refunded')),
  ADD COLUMN IF NOT EXISTS review_status             text
    CHECK (review_status IN ('draft','pending','approved','revision_requested',
                             'rejected','expired','suspended')),
  ADD COLUMN IF NOT EXISTS current_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS reviewed_by               uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at               timestamptz,
  ADD COLUMN IF NOT EXISTS review_note               text,
  ADD COLUMN IF NOT EXISTS refund_reason             text,
  ADD COLUMN IF NOT EXISTS refunded_at               timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_by               uuid REFERENCES profiles(id);

-- Backfill review_status from legacy approval_status
UPDATE promotions
SET review_status = CASE approval_status
  WHEN 'pending'  THEN 'pending'
  WHEN 'approved' THEN 'approved'
  WHEN 'rejected' THEN 'rejected'
  ELSE 'pending'
END
WHERE review_status IS NULL;

-- payment_status stays NULL for existing admin-created promos (correct per spec)

-- ============================================================
-- 4. New RLS policies for promotions
-- ============================================================

-- Tenants: see only live promotions for their property
CREATE POLICY "Tenants read live promotions"
  ON promotions FOR SELECT TO authenticated
  USING (
    review_status = 'approved'
    AND (start_date IS NULL OR start_date <= CURRENT_DATE)
    AND (end_date IS NULL  OR end_date   >  CURRENT_DATE)
    AND property_id = ANY(
      (SELECT property_ids FROM profiles WHERE id = auth.uid())
    )
  );

-- Advertisers: read own promotions (any status)
CREATE POLICY "Advertisers read own promotions"
  ON promotions FOR SELECT TO authenticated
  USING (advertiser_id = auth.uid());

-- Advertisers: create draft promotions
CREATE POLICY "Advertisers insert draft promotions"
  ON promotions FOR INSERT TO authenticated
  WITH CHECK (advertiser_id = auth.uid());

-- Advertisers: update own promotions (col-level protection at app layer)
CREATE POLICY "Advertisers update own promotions"
  ON promotions FOR UPDATE TO authenticated
  USING (advertiser_id = auth.uid())
  WITH CHECK (advertiser_id = auth.uid());

-- Admins: full access
CREATE POLICY "Admins manage all promotions"
  ON promotions FOR ALL TO authenticated
  USING (is_landlord());

-- ============================================================
-- 5. promotion_payment_attempts (new)
-- ============================================================
CREATE TABLE promotion_payment_attempts (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id               uuid NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  stripe_checkout_session_id text NOT NULL,
  stripe_payment_intent_id   text,
  amount_cents               integer NOT NULL,
  status                     text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created','completed','failed','canceled','refunded')),
  attempt_type               text NOT NULL DEFAULT 'initial'
    CHECK (attempt_type IN ('initial','repayment')),
  created_at                 timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE promotion_payment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advertisers read own payment attempts"
  ON promotion_payment_attempts FOR SELECT TO authenticated
  USING (
    promotion_id IN (SELECT id FROM promotions WHERE advertiser_id = auth.uid())
  );

CREATE POLICY "Admins read all payment attempts"
  ON promotion_payment_attempts FOR SELECT TO authenticated
  USING (is_landlord());

-- ============================================================
-- 6. promotion_status_events (new)
-- ============================================================
CREATE TABLE promotion_status_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id        uuid NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  from_review_status  text,
  to_review_status    text NOT NULL,
  from_payment_status text,
  to_payment_status   text,
  actor_user_id       uuid,
  actor_type          text NOT NULL
    CHECK (actor_type IN ('admin','advertiser','system','webhook')),
  note                text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE promotion_status_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advertisers read own status events"
  ON promotion_status_events FOR SELECT TO authenticated
  USING (
    promotion_id IN (SELECT id FROM promotions WHERE advertiser_id = auth.uid())
  );

CREATE POLICY "Admins read all status events"
  ON promotion_status_events FOR SELECT TO authenticated
  USING (is_landlord());

-- ============================================================
-- 7. ad_analytics (new)
-- ============================================================
CREATE TABLE ad_analytics (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  event_type   text NOT NULL CHECK (event_type IN ('view','tap')),
  tenant_id    uuid NOT NULL REFERENCES profiles(id),
  property_id  uuid NOT NULL REFERENCES properties(id),
  session_id   text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ad_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants insert own ad analytics"
  ON ad_analytics FOR INSERT TO authenticated
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Advertisers read own promotion analytics"
  ON ad_analytics FOR SELECT TO authenticated
  USING (
    promotion_id IN (SELECT id FROM promotions WHERE advertiser_id = auth.uid())
  );

CREATE POLICY "Admins read all ad analytics"
  ON ad_analytics FOR SELECT TO authenticated
  USING (is_landlord());

-- ============================================================
-- 8. stripe_webhook_events (new — service role only)
-- ============================================================
CREATE TABLE stripe_webhook_events (
  id           text PRIMARY KEY,
  type         text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies — only the service role (Next.js API routes) may access

-- ============================================================
-- 9. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_promotions_advertiser
  ON promotions(advertiser_id, review_status, created_at);

CREATE INDEX IF NOT EXISTS idx_ad_analytics_promotion
  ON ad_analytics(promotion_id, created_at);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_promotion
  ON promotion_payment_attempts(promotion_id, created_at);

CREATE INDEX IF NOT EXISTS idx_status_events_promotion
  ON promotion_status_events(promotion_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_analytics_view_dedup
  ON ad_analytics(promotion_id, tenant_id, session_id)
  WHERE event_type = 'view';

CREATE INDEX IF NOT EXISTS idx_promotions_live
  ON promotions(review_status, start_date, end_date)
  WHERE review_status = 'approved';

CREATE INDEX IF NOT EXISTS idx_payment_attempts_completed
  ON promotion_payment_attempts(promotion_id, status)
  WHERE status = 'completed';

COMMIT;
```

- [ ] **Step 2: Apply to local Supabase and verify**

Run: `npx supabase db reset`  
Expected: "Database reset successfully"

Verify tables and indexes exist:
```bash
npx supabase db diff --schema public 2>/dev/null | grep -E "^(CREATE TABLE|CREATE UNIQUE|CREATE INDEX|ALTER TABLE)"
```
Expected output includes: `CREATE TABLE advertiser_profiles`, `CREATE TABLE promotion_payment_attempts`, `CREATE TABLE promotion_status_events`, `CREATE TABLE ad_analytics`, `CREATE TABLE stripe_webhook_events`, all 7 indexes.

Verify rename succeeded:
```bash
npx supabase db diff --schema public 2>/dev/null | grep "advertiser_promotions"
```
Expected: no output (table was renamed, not recreated).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260412000100_m4_monetization.sql
git commit -m "feat(db): M4 migration — rename advertiser_promotions→promotions, add 5 M4 tables"
```

---

## Task 2: `issue-refund` Edge Function

**Files:**
- Create: `supabase/functions/issue-refund/index.ts`

- [ ] **Step 1: Write the function**

```typescript
// supabase/functions/issue-refund/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0';
import Stripe from 'https://esm.sh/stripe@17.4.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Verify caller is an admin
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user: caller } } = await callerClient.auth.getUser();
  if (!caller) return json({ error: 'Unauthorized' }, 401);

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single();

  if (callerProfile?.role !== 'landlord') return json({ error: 'Admin access required' }, 403);

  let body: { promotionId?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { promotionId, reason } = body;
  if (!promotionId || !reason) return json({ error: 'promotionId and reason are required' }, 400);

  // 1. Fetch promotion — verify eligible for refund
  const { data: promotion, error: promoErr } = await adminClient
    .from('promotions')
    .select('id, payment_status, review_status')
    .eq('id', promotionId)
    .single();

  if (promoErr || !promotion) return json({ error: 'Promotion not found' }, 404);

  if (!['paid', 'repayment_required'].includes(promotion.payment_status)) {
    return json({ error: 'Promotion is not in a refundable payment state' }, 422);
  }
  if (promotion.review_status !== 'rejected') {
    return json({ error: 'Promotion must be rejected before issuing a refund' }, 422);
  }

  // 2. Find most recent completed payment attempt
  const { data: attempt, error: attemptErr } = await adminClient
    .from('promotion_payment_attempts')
    .select('id, stripe_payment_intent_id')
    .eq('promotion_id', promotionId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (attemptErr || !attempt || !attempt.stripe_payment_intent_id) {
    return json({ error: 'No completed payment found for this promotion' }, 422);
  }

  // 3. Call Stripe Refunds API
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-11-20.acacia' });
  try {
    await stripe.refunds.create({ payment_intent: attempt.stripe_payment_intent_id });
  } catch (stripeErr) {
    const msg = stripeErr instanceof Error ? stripeErr.message : 'Stripe refund failed';
    return json({ error: msg }, 502);
  }

  const now = new Date().toISOString();

  // 4. Update promotion
  const { error: updateErr } = await adminClient
    .from('promotions')
    .update({
      payment_status: 'refunded',
      refunded_at: now,
      refunded_by: caller.id,
      refund_reason: reason,
    })
    .eq('id', promotionId);

  if (updateErr) return json({ error: updateErr.message }, 500);

  // 5. Update payment attempt
  await adminClient
    .from('promotion_payment_attempts')
    .update({ status: 'refunded' })
    .eq('id', attempt.id);

  // 6. Insert status event
  await adminClient.from('promotion_status_events').insert({
    promotion_id: promotionId,
    to_review_status: 'rejected',
    from_payment_status: promotion.payment_status,
    to_payment_status: 'refunded',
    actor_user_id: caller.id,
    actor_type: 'admin',
    note: reason,
  });

  return json({ success: true });
});
```

- [ ] **Step 2: Deploy and test locally**

Start local Supabase if not running:
```bash
npx supabase start
```

Deploy the function:
```bash
npx supabase functions serve issue-refund --env-file .env.local
```

Test the unauthorized path (in a second terminal):
```bash
curl -X POST http://localhost:54321/functions/v1/issue-refund \
  -H "Content-Type: application/json" \
  -d '{"promotionId":"test","reason":"test"}'
```
Expected: `{"error":"Unauthorized"}` with status 401.

Test the missing body path (with a valid admin JWT from Supabase dashboard):
```bash
curl -X POST http://localhost:54321/functions/v1/issue-refund \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{}'
```
Expected: `{"error":"promotionId and reason are required"}` with status 400.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/issue-refund/index.ts
git commit -m "feat(edge): add issue-refund Edge Function"
```

---

## Task 3: `expire-promotions` Edge Function + Cron

**Files:**
- Create: `supabase/functions/expire-promotions/index.ts`
- Modify: `supabase/config.toml`

- [ ] **Step 1: Write the function**

```typescript
// supabase/functions/expire-promotions/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Find all promotions where end_date < today and status is approved or suspended
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const { data: expiring, error: fetchErr } = await adminClient
    .from('promotions')
    .select('id, review_status')
    .in('review_status', ['approved', 'suspended'])
    .lt('end_date', today);

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!expiring || expiring.length === 0) {
    return new Response(JSON.stringify({ expired: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const ids = expiring.map((p) => p.id);

  // Update all to expired
  const { error: updateErr } = await adminClient
    .from('promotions')
    .update({ review_status: 'expired' })
    .in('id', ids);

  if (updateErr) {
    return new Response(JSON.stringify({ error: updateErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Insert a status event for each expired promotion
  const events = expiring.map((p) => ({
    promotion_id: p.id,
    from_review_status: p.review_status,
    to_review_status: 'expired',
    actor_type: 'system',
    note: null,
  }));

  await adminClient.from('promotion_status_events').insert(events);

  return new Response(JSON.stringify({ expired: ids.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 2: Register cron in `supabase/config.toml`**

Open `supabase/config.toml`. Find the `[functions]` section (or add it) and add the cron schedule. Add this block after the existing function entries:

```toml
[functions.expire-promotions]
schedule = "0 2 * * *"
```

This runs at 02:00 UTC every night.

- [ ] **Step 3: Test manually**

Insert a test promotion with `end_date = yesterday` directly in the local Supabase Studio (`http://localhost:54323`), set `review_status = 'approved'`. Then:

```bash
npx supabase functions serve expire-promotions --env-file .env.local
curl -X POST http://localhost:54321/functions/v1/expire-promotions
```

Expected: `{"expired":1}`. Verify in Studio that the test promotion's `review_status` is now `'expired'` and a `promotion_status_events` row with `actor_type = 'system'` was created.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/expire-promotions/index.ts supabase/config.toml
git commit -m "feat(edge): add expire-promotions scheduled Edge Function"
```

---

## Task 4: `promotions` Service (Mobile)

**Files:**
- Create: `services/promotions.ts`
- Create: `__tests__/services/promotions.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/services/promotions.test.ts
import { promotionsService } from '@/services/promotions';

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    })),
  },
}));

import { supabase } from '@/services/supabase';

describe('promotionsService.reviewPromotion', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sets review_status=approved and clears review_note on approve', async () => {
    const mockPromotion = {
      id: 'promo-1',
      review_status: 'approved',
      review_note: null,
      reviewed_by: 'admin-1',
      reviewed_at: expect.any(String),
    };

    const fromMock = supabase.from as jest.Mock;
    const singleMock = jest.fn().mockResolvedValue({ data: mockPromotion, error: null });
    fromMock.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      single: singleMock,
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    });

    const result = await promotionsService.reviewPromotion('promo-1', {
      action: 'approve',
      reviewedBy: 'admin-1',
    });

    expect(result.review_status).toBe('approved');
    expect(result.review_note).toBeNull();
  });

  it('sets review_status=revision_requested and payment_status=repayment_required on require_repayment', async () => {
    const mockPromotion = {
      id: 'promo-1',
      review_status: 'revision_requested',
      payment_status: 'repayment_required',
      review_note: 'Please update pricing info',
      reviewed_by: 'admin-1',
      reviewed_at: expect.any(String),
    };

    const fromMock = supabase.from as jest.Mock;
    const singleMock = jest.fn().mockResolvedValue({ data: mockPromotion, error: null });
    fromMock.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      single: singleMock,
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    });

    const result = await promotionsService.reviewPromotion('promo-1', {
      action: 'require_repayment',
      note: 'Please update pricing info',
      reviewedBy: 'admin-1',
    });

    expect(result.review_status).toBe('revision_requested');
    expect(result.payment_status).toBe('repayment_required');
    expect(result.review_note).toBe('Please update pricing info');
  });
});

describe('promotionsService.hasCompletedPaymentAttempt', () => {
  it('returns true when a completed attempt exists', async () => {
    const fromMock = supabase.from as jest.Mock;
    fromMock.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [{ id: 'attempt-1' }], error: null }),
      in: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    });

    const result = await promotionsService.hasCompletedPaymentAttempt('promo-1');
    expect(result).toBe(true);
  });

  it('returns false when no completed attempt exists', async () => {
    const fromMock = supabase.from as jest.Mock;
    fromMock.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      in: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    });

    const result = await promotionsService.hasCompletedPaymentAttempt('promo-1');
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern="services/promotions" --verbose`  
Expected: FAIL — "Cannot find module '@/services/promotions'"

- [ ] **Step 3: Write `services/promotions.ts`**

```typescript
// services/promotions.ts
import { supabase } from './supabase';

export type ReviewStatus =
  | 'draft' | 'pending' | 'approved' | 'revision_requested'
  | 'rejected' | 'expired' | 'suspended';

export type PaymentStatus =
  | 'unpaid' | 'paid' | 'repayment_required' | 'refunded' | null;

export type Promotion = {
  id: string;
  property_id: string;
  advertiser_id: string | null;
  business_name: string;
  business_type: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  headline: string;
  description: string | null;
  image_url: string | null;
  cta_link: string | null;
  cta_text: string | null;
  payment_status: PaymentStatus;
  review_status: ReviewStatus;
  current_payment_intent_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  refund_reason: string | null;
  refunded_at: string | null;
  refunded_by: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

export type ReviewAction = {
  action: 'approve' | 'allow_revision' | 'require_repayment' | 'reject';
  note?: string;
  reviewedBy: string;
};

export const promotionsService = {
  async getLiveForProperty(propertyId: string): Promise<Promotion[]> {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('property_id', propertyId)
      .eq('review_status', 'approved')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getForAdmin(propertyId: string, reviewStatus: string): Promise<Promotion[]> {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('property_id', propertyId)
      .eq('review_status', reviewStatus)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createAdminPromotion(promotionData: Partial<Promotion>): Promise<Promotion> {
    const { data, error } = await supabase
      .from('promotions')
      .insert({ ...promotionData, payment_status: null })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async reviewPromotion(id: string, action: ReviewAction): Promise<Promotion> {
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      reviewed_by: action.reviewedBy,
      reviewed_at: now,
    };

    if (action.action === 'approve') {
      updates.review_status = 'approved';
      updates.review_note = null;
    } else if (action.action === 'allow_revision') {
      updates.review_status = 'revision_requested';
      updates.review_note = action.note!;
    } else if (action.action === 'require_repayment') {
      updates.review_status = 'revision_requested';
      updates.payment_status = 'repayment_required';
      updates.review_note = action.note!;
    } else if (action.action === 'reject') {
      updates.review_status = 'rejected';
      updates.review_note = action.note!;
    }

    const { data, error } = await supabase
      .from('promotions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    // Insert audit event (fire-and-forget pattern — errors logged, not thrown)
    supabase.from('promotion_status_events').insert({
      promotion_id: id,
      to_review_status: updates.review_status as string,
      to_payment_status: (updates.payment_status as string) ?? null,
      actor_user_id: action.reviewedBy,
      actor_type: 'admin',
      note: action.note ?? null,
    }).then(({ error: evtErr }) => {
      if (evtErr) console.warn('Failed to insert status event:', evtErr.message);
    });

    return data;
  },

  async toggleSuspend(
    id: string,
    currentStatus: 'approved' | 'suspended',
    adminId: string
  ): Promise<Promotion> {
    const newStatus = currentStatus === 'approved' ? 'suspended' : 'approved';
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('promotions')
      .update({ review_status: newStatus, reviewed_by: adminId, reviewed_at: now })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    supabase.from('promotion_status_events').insert({
      promotion_id: id,
      from_review_status: currentStatus,
      to_review_status: newStatus,
      actor_user_id: adminId,
      actor_type: 'admin',
      note: null,
    }).then(({ error: evtErr }) => {
      if (evtErr) console.warn('Failed to insert status event:', evtErr.message);
    });

    return data;
  },

  async hasCompletedPaymentAttempt(id: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('promotion_payment_attempts')
      .select('id')
      .eq('promotion_id', id)
      .eq('status', 'completed')
      .limit(1);
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern="services/promotions" --verbose`  
Expected: PASS — 4 tests pass.

- [ ] **Step 5: Update backward-compat re-export in `services/advertiser-promotions.ts`**

Replace the full contents of `services/advertiser-promotions.ts` with:

```typescript
// services/advertiser-promotions.ts
// DEPRECATED: Kept for backward compat during M4 rollout.
// New code should import from @/services/promotions directly.
export { promotionsService as advertiserPromotionsService } from './promotions';
export type { Promotion as AdvertiserPromotion } from './promotions';
```

- [ ] **Step 6: Commit**

```bash
git add services/promotions.ts services/advertiser-promotions.ts \
        __tests__/services/promotions.test.ts
git commit -m "feat(mobile): add promotions service for M4 schema"
```

---

## Task 5: Analytics Service + Recording

**Files:**
- Create: `services/analytics.ts`
- Create: `__tests__/services/analytics.test.ts`
- Modify: `app/(tabs)/promotions.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/services/analytics.test.ts
import { analyticsService, resetSessionForTest } from '@/services/analytics';

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

import { supabase } from '@/services/supabase';

describe('analyticsService.recordView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSessionForTest();
  });

  it('inserts a view event on first call', async () => {
    const fromMock = supabase.from as jest.Mock;
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ insert: insertMock });

    await analyticsService.recordView({
      promotionId: 'p1',
      tenantId: 't1',
      propertyId: 'prop1',
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        promotion_id: 'p1',
        event_type: 'view',
        tenant_id: 't1',
        property_id: 'prop1',
      })
    );
  });

  it('skips duplicate view for same promotion+session', async () => {
    const fromMock = supabase.from as jest.Mock;
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ insert: insertMock });

    await analyticsService.recordView({ promotionId: 'p1', tenantId: 't1', propertyId: 'prop1' });
    await analyticsService.recordView({ promotionId: 'p1', tenantId: 't1', propertyId: 'prop1' });

    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it('records views for different promotions independently', async () => {
    const fromMock = supabase.from as jest.Mock;
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ insert: insertMock });

    await analyticsService.recordView({ promotionId: 'p1', tenantId: 't1', propertyId: 'prop1' });
    await analyticsService.recordView({ promotionId: 'p2', tenantId: 't1', propertyId: 'prop1' });

    expect(insertMock).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern="services/analytics" --verbose`  
Expected: FAIL — "Cannot find module '@/services/analytics'"

- [ ] **Step 3: Write `services/analytics.ts`**

```typescript
// services/analytics.ts
import { supabase } from './supabase';

// Session ID generated once per app launch, stored in module scope
let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    sessionId =
      Math.random().toString(36).slice(2, 9) +
      Math.random().toString(36).slice(2, 9);
  }
  return sessionId;
}

// Client-side dedup: tracks (promotionId + sessionId) pairs already recorded
const recordedViews = new Set<string>();

// Test helper — resets module state between tests
export function resetSessionForTest() {
  sessionId = null;
  recordedViews.clear();
}

export const analyticsService = {
  async recordView(params: {
    promotionId: string;
    tenantId: string;
    propertyId: string;
  }): Promise<void> {
    const sid = getSessionId();
    const key = `${params.promotionId}:${sid}`;
    if (recordedViews.has(key)) return;
    recordedViews.add(key);

    const { error } = await supabase.from('ad_analytics').insert({
      promotion_id: params.promotionId,
      event_type: 'view',
      tenant_id: params.tenantId,
      property_id: params.propertyId,
      session_id: sid,
    });

    // Silently ignore unique constraint violations (server-side dedup safety net)
    if (error && !error.message.includes('duplicate key')) throw error;
  },

  async recordTap(params: {
    promotionId: string;
    tenantId: string;
    propertyId: string;
  }): Promise<void> {
    const { error } = await supabase.from('ad_analytics').insert({
      promotion_id: params.promotionId,
      event_type: 'tap',
      tenant_id: params.tenantId,
      property_id: params.propertyId,
      session_id: getSessionId(),
    });
    if (error) throw error;
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern="services/analytics" --verbose`  
Expected: PASS — 3 tests pass.

- [ ] **Step 5: Wire analytics into `app/(tabs)/promotions.tsx`**

Open `app/(tabs)/promotions.tsx`. Add the import at the top (after existing imports):

```typescript
import { analyticsService } from '@/services/analytics';
```

Replace the `renderItem` callback with this version that fires analytics:

```typescript
const renderItem = useCallback(({ item }: { item: PromotionItem }) => {
  if (item.kind === 'tenant') {
    return (
      <View className="px-4 mb-3">
        <PromotionCard variant="tenant" data={item.data} />
      </View>
    );
  }

  const handleAdTap = () => {
    analyticsService.recordTap({
      promotionId: item.data.id,
      tenantId: profile?.id ?? '',
      propertyId: item.data.property_id,
    }).catch(() => {});
  };

  return (
    <View className="px-4 mb-3">
      <PromotionCard variant="advertiser" data={item.data} onPress={handleAdTap} />
    </View>
  );
}, [profile]);
```

Add `onViewableItemsChanged` to the FlatList to record view events. Add this callback above the `renderItem` callback:

```typescript
const { profile } = useAuth();

const handleViewableItemsChanged = useCallback(
  ({ viewableItems }: { viewableItems: Array<{ item: PromotionItem }> }) => {
    for (const { item } of viewableItems) {
      if (item.kind === 'advertiser') {
        analyticsService.recordView({
          promotionId: item.data.id,
          tenantId: profile?.id ?? '',
          propertyId: item.data.property_id,
        }).catch(() => {});
      }
    }
  },
  [profile]
);
```

Add `onViewableItemsChanged` and `viewabilityConfig` props to the FlatList:

```typescript
<FlatList
  data={promotions ?? []}
  keyExtractor={keyExtractor}
  renderItem={renderItem}
  onViewableItemsChanged={handleViewableItemsChanged}
  viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
  contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
  refreshControl={
    <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
  }
  ListEmptyComponent={
    <EmptyState
      icon={Megaphone}
      title="No promotions yet"
      message="Tenant offers and local deals will appear here."
    />
  }
/>
```

- [ ] **Step 6: Update `hooks/usePromotions.ts` for renamed table**

Replace the full file contents:

```typescript
// hooks/usePromotions.ts
import { useQuery } from '@tanstack/react-query';
import { postsService, type Post } from '@/services/posts';
import { promotionsService, type Promotion } from '@/services/promotions';

export type PromotionItem =
  | { kind: 'tenant'; data: Post }
  | { kind: 'advertiser'; data: Promotion };

type Segment = 'All' | 'Tenant Offers' | 'Local Deals';

export function usePromotions(propertyId: string, segment: Segment) {
  return useQuery<PromotionItem[]>({
    queryKey: ['promotions', propertyId, segment],
    queryFn: async () => {
      const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD for date comparison
      const results: PromotionItem[] = [];

      const fetchTenant = segment === 'All' || segment === 'Tenant Offers';
      const fetchAdvertiser = segment === 'All' || segment === 'Local Deals';

      const [tenantPosts, advertiserPromotions] = await Promise.all([
        fetchTenant
          ? postsService.filter({ property_id: propertyId, type: 'offer' })
          : Promise.resolve([] as Post[]),
        fetchAdvertiser
          ? promotionsService.getLiveForProperty(propertyId)
          : Promise.resolve([] as Promotion[]),
      ]);

      for (const post of tenantPosts) {
        results.push({ kind: 'tenant', data: post });
      }

      for (const promo of advertiserPromotions) {
        // Client-side date check (RLS also enforces this server-side)
        const withinDateRange =
          (!promo.start_date || promo.start_date <= now) &&
          (!promo.end_date || promo.end_date >= now);
        if (withinDateRange) {
          results.push({ kind: 'advertiser', data: promo });
        }
      }

      results.sort((a, b) => {
        const dateA = a.kind === 'tenant' ? a.data.created_date : a.data.created_at;
        const dateB = b.kind === 'tenant' ? b.data.created_date : b.data.created_at;
        return dateB.localeCompare(dateA);
      });

      return results;
    },
    enabled: !!propertyId,
  });
}
```

- [ ] **Step 7: Commit**

```bash
git add services/analytics.ts __tests__/services/analytics.test.ts \
        app/(tabs)/promotions.tsx hooks/usePromotions.ts
git commit -m "feat(mobile): analytics recording for advertiser promotion views and taps"
```

---

## Task 6: Admin Review Workflow

**Files:**
- Create: `components/admin/ReviewNoteModal.tsx`
- Modify: `app/(admin)/advertisers.tsx`
- Modify: `hooks/useAdvertiserPromotions.ts`

- [ ] **Step 1: Update `hooks/useAdvertiserPromotions.ts`**

Replace the full file:

```typescript
// hooks/useAdvertiserPromotions.ts
import { useQuery } from '@tanstack/react-query';
import { promotionsService, type Promotion } from '@/services/promotions';

export function useAdvertiserPromotions(propertyId: string, reviewStatus: string) {
  return useQuery<Promotion[]>({
    queryKey: ['advertiserPromotions', propertyId, reviewStatus],
    queryFn: () => promotionsService.getForAdmin(propertyId, reviewStatus),
    enabled: !!propertyId,
  });
}
```

- [ ] **Step 2: Create `components/admin/ReviewNoteModal.tsx`**

```typescript
// components/admin/ReviewNoteModal.tsx
import { useState } from 'react';
import { View, Text } from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

type ReviewNoteModalProps = {
  visible: boolean;
  actionLabel: string;
  actionColor: string;
  onConfirm: (note: string) => void;
  onCancel: () => void;
};

export function ReviewNoteModal({
  visible,
  actionLabel,
  actionColor,
  onConfirm,
  onCancel,
}: ReviewNoteModalProps) {
  const [note, setNote] = useState('');

  const handleConfirm = () => {
    if (!note.trim()) return;
    onConfirm(note.trim());
    setNote('');
  };

  const handleCancel = () => {
    setNote('');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      onClose={handleCancel}
      title={actionLabel}
      actions={[
        {
          label: actionLabel,
          onPress: handleConfirm,
          variant: 'primary',
        },
        { label: 'Cancel', onPress: handleCancel, variant: 'secondary' },
      ]}
    >
      <View className="pb-2">
        <Text className="text-sm text-brand-steel mb-3">
          This note will be shown to the advertiser.
        </Text>
        <Input
          label="Note *"
          value={note}
          onChangeText={setNote}
          placeholder="Enter your reason..."
          multiline
          numberOfLines={4}
        />
      </View>
    </Modal>
  );
}
```

- [ ] **Step 3: Rewrite `app/(admin)/advertisers.tsx`**

Replace the full file:

```typescript
// app/(admin)/advertisers.tsx
import { useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import Toast from 'react-native-toast-message';
import { useQueryClient } from '@tanstack/react-query';
import { Megaphone, AlertTriangle } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PropertySelector } from '@/components/admin/PropertySelector';
import { ReviewNoteModal } from '@/components/admin/ReviewNoteModal';
import { useAuth } from '@/lib/AuthContext';
import { useAdvertiserPromotions } from '@/hooks/useAdvertiserPromotions';
import { promotionsService, type Promotion } from '@/services/promotions';
import { adminService } from '@/services/admin';
import { supabase } from '@/services/supabase';

const STATUS_SEGMENTS = ['Pending', 'Approved', 'Rejected'];

type PendingAction = {
  promotion: Promotion;
  action: 'allow_revision' | 'require_repayment' | 'reject';
  label: string;
};

export default function AdvertisersScreen() {
  const { propertyIds, user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [anomalyWarnings, setAnomalyWarnings] = useState<Set<string>>(new Set());

  // Add promotion form state
  const [formBusinessName, setFormBusinessName] = useState('');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [ctaLink, setCtaLink] = useState('');

  const activePropertyId = selectedPropertyId ?? '';

  const { data: promotions, isLoading } = useAdvertiserPromotions(
    activePropertyId,
    statusFilter.toLowerCase()
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['advertiserPromotions'] });

  const resetForm = () => {
    setFormBusinessName('');
    setHeadline('');
    setDescription('');
    setCtaLink('');
  };

  const handleOpenDetail = async (promo: Promotion) => {
    setSelectedPromotion(promo);
    // Check for anomaly: payment_status=paid but no completed payment attempt
    if (promo.payment_status === 'paid') {
      const hasPayment = await promotionsService.hasCompletedPaymentAttempt(promo.id);
      if (!hasPayment) {
        setAnomalyWarnings((prev) => new Set(prev).add(promo.id));
      }
    }
  };

  const handleReviewAction = async (
    promo: Promotion,
    action: 'approve' | 'allow_revision' | 'require_repayment' | 'reject',
    note?: string
  ) => {
    if (!user) return;
    try {
      await promotionsService.reviewPromotion(promo.id, {
        action,
        note,
        reviewedBy: user.id,
      });
      if (action === 'approve') {
        adminService.sendPush({
          property_id: activePropertyId,
          title: `New local deal from ${promo.business_name}`,
          message: promo.headline,
          data: { type: 'advertiser_approved' },
        }).catch(() => {});
      }
      Toast.show({
        type: 'success',
        text1: action === 'approve' ? 'Promotion approved' :
               action === 'reject' ? 'Promotion rejected' :
               'Revision requested',
      });
      setSelectedPromotion(null);
      setPendingAction(null);
      await invalidate();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action failed';
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    }
  };

  const handleToggleSuspend = async (promo: Promotion) => {
    if (!user) return;
    if (promo.review_status !== 'approved' && promo.review_status !== 'suspended') return;
    try {
      await promotionsService.toggleSuspend(
        promo.id,
        promo.review_status as 'approved' | 'suspended',
        user.id
      );
      Toast.show({
        type: 'success',
        text1: promo.review_status === 'approved' ? 'Promotion suspended' : 'Promotion reinstated',
      });
      setSelectedPromotion(null);
      await invalidate();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action failed';
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    }
  };

  const handleIssueRefund = async (promo: Promotion) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke('issue-refund', {
        body: { promotionId: promo.id, reason: 'Admin-initiated refund' },
      });
      if (error) throw new Error(error.message);
      if (!data.success) throw new Error('Refund failed');
      Toast.show({ type: 'success', text1: 'Refund issued' });
      setSelectedPromotion(null);
      await invalidate();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refund failed';
      Toast.show({ type: 'error', text1: 'Refund failed', text2: message });
    }
  };

  const handleAddPromotion = async () => {
    if (!formBusinessName.trim() || !headline.trim() || !activePropertyId || !user) {
      Toast.show({ type: 'error', text1: 'Please fill in all required fields' });
      return;
    }
    setSubmitting(true);
    try {
      await promotionsService.createAdminPromotion({
        property_id: activePropertyId,
        business_name: formBusinessName.trim(),
        headline: headline.trim(),
        description: description.trim() || null,
        cta_link: ctaLink.trim() || null,
        review_status: 'approved',
      });
      Toast.show({ type: 'success', text1: 'Promotion created' });
      adminService.sendPush({
        property_id: activePropertyId,
        title: `New local deal from ${formBusinessName.trim()}`,
        message: headline.trim(),
        data: { type: 'advertiser_approved' },
      }).catch(() => {});
      await invalidate();
      setAddModalVisible(false);
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create promotion';
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    } finally {
      setSubmitting(false);
    }
  };

  const renderPromotion = ({ item }: { item: Promotion }) => (
    <Pressable onPress={() => handleOpenDetail(item)}>
      <Card className="mx-4 mb-3 p-4">
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-3">
            <Text className="text-base font-bold text-brand-navy">{item.headline}</Text>
            <Text className="text-sm text-brand-steel mt-0.5">{item.business_name}</Text>
          </View>
          <StatusBadge status={item.review_status ?? 'pending'} size="sm" />
        </View>
        {item.description ? (
          <Text className="text-sm text-brand-steel leading-5 mb-3" numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );

  const renderDetailModal = () => {
    if (!selectedPromotion) return null;
    const promo = selectedPromotion;
    const showAnomaly = anomalyWarnings.has(promo.id);
    const canRefund =
      promo.review_status === 'rejected' &&
      (promo.payment_status === 'paid' || promo.payment_status === 'repayment_required');
    const canSuspendOrReinstate =
      promo.review_status === 'approved' || promo.review_status === 'suspended';

    return (
      <Modal
        visible={!!selectedPromotion}
        onClose={() => setSelectedPromotion(null)}
        title="Promotion Details"
        actions={[{ label: 'Close', onPress: () => setSelectedPromotion(null), variant: 'secondary' }]}
      >
        <View className="gap-3 pb-4">
          {showAnomaly && (
            <View className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 flex-row gap-2">
              <AlertTriangle size={16} color="#b45309" />
              <Text className="text-sm text-yellow-800 flex-1">
                No completed payment record found — verify before approving.
              </Text>
            </View>
          )}

          <Text className="text-lg font-bold text-brand-navy">{promo.headline}</Text>
          <Text className="text-sm text-brand-steel">{promo.business_name}</Text>

          <View className="flex-row gap-2 flex-wrap">
            <StatusBadge status={promo.review_status ?? 'pending'} size="sm" />
            {promo.payment_status && (
              <StatusBadge status={promo.payment_status} size="sm" />
            )}
          </View>

          {promo.review_note && (
            <View className="bg-gray-50 rounded-lg p-3">
              <Text className="text-xs font-semibold text-brand-steel mb-1">Review note</Text>
              <Text className="text-sm text-brand-navy">{promo.review_note}</Text>
            </View>
          )}

          {/* 4-button review panel — only for pending promotions */}
          {promo.review_status === 'pending' && (
            <View className="gap-2 mt-2">
              <Button
                variant="primary"
                onPress={() => handleReviewAction(promo, 'approve')}
              >
                Approve
              </Button>
              <Button
                variant="secondary"
                onPress={() =>
                  setPendingAction({ promotion: promo, action: 'allow_revision', label: 'Allow Revision' })
                }
              >
                Allow Revision
              </Button>
              <Button
                variant="secondary"
                onPress={() =>
                  setPendingAction({ promotion: promo, action: 'require_repayment', label: 'Require Repayment' })
                }
              >
                Require Repayment
              </Button>
              <Button
                variant="destructive"
                onPress={() =>
                  setPendingAction({ promotion: promo, action: 'reject', label: 'Reject' })
                }
              >
                Reject
              </Button>
            </View>
          )}

          {/* Suspend / Reinstate — only for approved or suspended */}
          {canSuspendOrReinstate && (
            <Button
              variant={promo.review_status === 'approved' ? 'destructive' : 'primary'}
              onPress={() => handleToggleSuspend(promo)}
            >
              {promo.review_status === 'approved' ? 'Suspend' : 'Reinstate'}
            </Button>
          )}

          {/* Issue Refund — only for rejected + paid/repayment_required */}
          {canRefund && (
            <Button variant="destructive" onPress={() => handleIssueRefund(promo)}>
              Issue Refund
            </Button>
          )}
        </View>
      </Modal>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Advertisers</Text>
        <View className="mt-3">
          <PropertySelector
            propertyIds={propertyIds}
            selected={selectedPropertyId}
            onSelect={setSelectedPropertyId}
          />
        </View>
      </GradientHeader>

      {!activePropertyId ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-brand-steel text-base text-center">
            Select a property to manage promotions
          </Text>
        </View>
      ) : (
        <>
          <View className="px-4 pt-4 gap-3">
            <SegmentedControl
              segments={STATUS_SEGMENTS}
              selected={statusFilter}
              onChange={setStatusFilter}
            />
            <Button onPress={() => setAddModalVisible(true)}>Add Promotion</Button>
          </View>

          {isLoading ? (
            <LoadingScreen message="Loading promotions..." />
          ) : (
            <FlatList
              data={promotions ?? []}
              keyExtractor={(item) => item.id}
              renderItem={renderPromotion}
              contentContainerStyle={{ flexGrow: 1, paddingTop: 12, paddingBottom: 32 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <EmptyState
                  icon={Megaphone}
                  title="No promotions"
                  message={`No ${statusFilter.toLowerCase()} promotions for this property`}
                />
              }
            />
          )}
        </>
      )}

      {/* Add Promotion Modal */}
      <Modal
        visible={addModalVisible}
        onClose={() => { setAddModalVisible(false); resetForm(); }}
        title="Add Promotion"
        actions={[
          {
            label: submitting ? 'Creating...' : 'Create Promotion',
            onPress: handleAddPromotion,
            variant: 'primary',
          },
          { label: 'Cancel', onPress: () => { setAddModalVisible(false); resetForm(); }, variant: 'secondary' },
        ]}
      >
        <View className="gap-1 pb-2">
          <Input label="Business Name *" value={formBusinessName} onChangeText={setFormBusinessName} placeholder="Acme Corp" />
          <Input label="Headline *" value={headline} onChangeText={setHeadline} placeholder="Summer Sale — 20% Off" />
          <Input label="Description" value={description} onChangeText={setDescription} placeholder="Tell tenants about this promotion..." multiline numberOfLines={3} />
          <Input label="CTA Link" value={ctaLink} onChangeText={setCtaLink} placeholder="https://example.com" keyboardType="url" autoCapitalize="none" />
        </View>
      </Modal>

      {renderDetailModal()}

      {/* Note-required action modal */}
      {pendingAction && (
        <ReviewNoteModal
          visible={!!pendingAction}
          actionLabel={pendingAction.label}
          actionColor={
            pendingAction.action === 'reject' ? '#ef4444' :
            pendingAction.action === 'require_repayment' ? '#a855f7' : '#f59e0b'
          }
          onConfirm={(note) =>
            handleReviewAction(pendingAction.promotion, pendingAction.action, note)
          }
          onCancel={() => setPendingAction(null)}
        />
      )}
    </View>
  );
}
```

- [ ] **Step 4: Verify app compiles**

Run: `npx expo start --clear` (Ctrl-C after bundle succeeds)  
Expected: No TypeScript errors in the output.

- [ ] **Step 5: Commit**

```bash
git add app/(admin)/advertisers.tsx hooks/useAdvertiserPromotions.ts \
        components/admin/ReviewNoteModal.tsx
git commit -m "feat(mobile): admin review workflow — 4 actions, note modal, suspend/reinstate, refund"
```

---

## Task 7: Admin Revenue + Engagement Stats

**Files:**
- Modify: `services/admin.ts`
- Create: `components/admin/RevenueChart.tsx`
- Create: `components/admin/EngagementStats.tsx`
- Modify: `app/(admin)/index.tsx`

- [ ] **Step 1: Install victory-native**

```bash
npm install victory-native@36
```

- [ ] **Step 2: Add revenue/engagement stats to `services/admin.ts`**

Open `services/admin.ts`. Add this type and function after the existing `getStats` function:

```typescript
export type MonthlyRevenue = {
  month: string; // 'YYYY-MM'
  gross_cents: number;
  net_cents: number;
};

export type EngagementStats = {
  views: number;
  taps: number;
};
```

Add these two methods inside the `adminService` object, after `getStats`:

```typescript
  async getRevenueStats(): Promise<MonthlyRevenue[]> {
    // 6 months ending today
    const months: MonthlyRevenue[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const monthStart = `${year}-${month}-01T00:00:00.000Z`;
      const nextMonth = new Date(year, d.getMonth() + 1, 1);
      const monthEnd = nextMonth.toISOString();

      const [completed, refunded] = await Promise.all([
        supabase
          .from('promotion_payment_attempts')
          .select('amount_cents')
          .eq('status', 'completed')
          .gte('created_at', monthStart)
          .lt('created_at', monthEnd),
        supabase
          .from('promotion_payment_attempts')
          .select('amount_cents')
          .eq('status', 'refunded')
          .gte('created_at', monthStart)
          .lt('created_at', monthEnd),
      ]);

      const gross = (completed.data ?? []).reduce((sum, r) => sum + (r.amount_cents ?? 0), 0);
      const refunds = (refunded.data ?? []).reduce((sum, r) => sum + (r.amount_cents ?? 0), 0);

      months.push({ month: `${year}-${month}`, gross_cents: gross, net_cents: gross - refunds });
    }

    return months;
  },

  async getEngagementStats(propertyId: string): Promise<EngagementStats> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // promotions active in this property during current month
    const { data: promoIds } = await supabase
      .from('promotions')
      .select('id')
      .eq('property_id', propertyId);

    if (!promoIds || promoIds.length === 0) return { views: 0, taps: 0 };

    const ids = promoIds.map((p) => p.id);

    const [views, taps] = await Promise.all([
      supabase
        .from('ad_analytics')
        .select('id', { count: 'exact', head: true })
        .in('promotion_id', ids)
        .eq('event_type', 'view')
        .gte('created_at', monthStart),
      supabase
        .from('ad_analytics')
        .select('id', { count: 'exact', head: true })
        .in('promotion_id', ids)
        .eq('event_type', 'tap')
        .gte('created_at', monthStart),
    ]);

    return {
      views: views.count ?? 0,
      taps: taps.count ?? 0,
    };
  },
```

Also update `getStats` to query from the renamed `promotions` table using `review_status`:

In `getStats`, replace the `promotions` query:

```typescript
      // Replace this line:
      // .from('advertiser_promotions')
      // .eq('approval_status', 'approved')
      // With:
      supabase
        .from('promotions')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId)
        .eq('review_status', 'approved')
        .gte('created_at', thirtyDaysAgo),
```

- [ ] **Step 3: Create `components/admin/RevenueChart.tsx`**

```typescript
// components/admin/RevenueChart.tsx
import { View, Text } from 'react-native';
import { VictoryBar, VictoryChart, VictoryAxis } from 'victory-native';
import type { MonthlyRevenue } from '@/services/admin';

type RevenueChartProps = {
  data: MonthlyRevenue[];
};

function shortMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleString('default', { month: 'short' });
}

export function RevenueChart({ data }: RevenueChartProps) {
  const chartData = data.map((d) => ({
    x: shortMonth(d.month),
    y: d.gross_cents / 100,
  }));

  const currentMonth = data[data.length - 1];
  const grossDollars = ((currentMonth?.gross_cents ?? 0) / 100).toFixed(2);
  const netDollars = ((currentMonth?.net_cents ?? 0) / 100).toFixed(2);

  return (
    <View className="bg-white rounded-xl border border-gray-100 p-4 mx-4 mt-4">
      <Text className="text-base font-bold text-brand-navy mb-1">Revenue</Text>
      <View className="flex-row gap-4 mb-3">
        <View>
          <Text className="text-xs text-brand-steel">This month gross</Text>
          <Text className="text-lg font-bold text-brand-navy">${grossDollars}</Text>
        </View>
        <View>
          <Text className="text-xs text-brand-steel">Net (after refunds)</Text>
          <Text className="text-lg font-bold text-green-700">${netDollars}</Text>
        </View>
      </View>
      <VictoryChart height={160} padding={{ top: 10, bottom: 30, left: 40, right: 10 }}>
        <VictoryAxis style={{ tickLabels: { fontSize: 10, fill: '#7C8DA7' } }} />
        <VictoryAxis
          dependentAxis
          tickFormat={(t) => `$${t}`}
          style={{ tickLabels: { fontSize: 10, fill: '#7C8DA7' } }}
        />
        <VictoryBar
          data={chartData}
          style={{ data: { fill: '#465A75' } }}
          barWidth={24}
        />
      </VictoryChart>
    </View>
  );
}
```

- [ ] **Step 4: Create `components/admin/EngagementStats.tsx`**

```typescript
// components/admin/EngagementStats.tsx
import { View, Text } from 'react-native';
import { Eye, MousePointerClick } from 'lucide-react-native';
import type { EngagementStats as EngagementStatsType } from '@/services/admin';
import { BRAND } from '@/constants/colors';

type EngagementStatsProps = {
  data: EngagementStatsType;
};

export function EngagementStats({ data }: EngagementStatsProps) {
  const tapRate =
    data.views > 0 ? ((data.taps / data.views) * 100).toFixed(1) : '0.0';

  return (
    <View className="bg-white rounded-xl border border-gray-100 p-4 mx-4 mt-3">
      <Text className="text-base font-bold text-brand-navy mb-3">Ad Engagement (this month)</Text>
      <View className="flex-row gap-4">
        <View className="flex-1 flex-row items-center gap-2">
          <Eye size={18} color={BRAND.blue} />
          <View>
            <Text className="text-xl font-bold text-brand-navy">{data.views.toLocaleString()}</Text>
            <Text className="text-xs text-brand-steel">Views</Text>
          </View>
        </View>
        <View className="flex-1 flex-row items-center gap-2">
          <MousePointerClick size={18} color={BRAND.blue} />
          <View>
            <Text className="text-xl font-bold text-brand-navy">{data.taps.toLocaleString()}</Text>
            <Text className="text-xs text-brand-steel">Taps</Text>
          </View>
        </View>
        <View className="flex-1">
          <Text className="text-xl font-bold text-brand-navy">{tapRate}%</Text>
          <Text className="text-xs text-brand-steel">Tap rate</Text>
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 5: Update `app/(admin)/index.tsx` to add new sections**

Add these imports at the top of `app/(admin)/index.tsx` (after existing imports):

```typescript
import { useQuery } from '@tanstack/react-query';
import { RevenueChart } from '@/components/admin/RevenueChart';
import { EngagementStats } from '@/components/admin/EngagementStats';
```

After the existing `useAdminStats` and `usePosts` hooks inside `AdminDashboard`, add:

```typescript
  const { data: revenueStats } = useQuery({
    queryKey: ['revenueStats'],
    queryFn: () => adminService.getRevenueStats(),
    enabled: !!activePropertyId,
  });

  const { data: engagementStats } = useQuery({
    queryKey: ['engagementStats', activePropertyId],
    queryFn: () => adminService.getEngagementStats(activePropertyId),
    enabled: !!activePropertyId,
  });
```

Inside the `ScrollView`, after the existing `View Pending Approvals` pressable block, add:

```typescript
          {/* Revenue Chart */}
          {revenueStats && revenueStats.length > 0 && (
            <RevenueChart data={revenueStats} />
          )}

          {/* Ad Engagement */}
          {engagementStats && (
            <EngagementStats data={engagementStats} />
          )}
```

- [ ] **Step 6: Verify app compiles with no TS errors**

Run: `npx expo start --clear` (Ctrl-C after bundle completes)  
Expected: zero TypeScript errors in Metro output.

- [ ] **Step 7: Commit**

```bash
git add services/admin.ts components/admin/RevenueChart.tsx \
        components/admin/EngagementStats.tsx app/(admin)/index.tsx
git commit -m "feat(mobile): admin dashboard revenue chart and engagement stats (M4)"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] DB migration — all 6 tables, indexes, RLS (Task 1)
- [x] `issue-refund` Edge Function (Task 2)
- [x] `expire-promotions` cron Edge Function (Task 3)
- [x] Analytics recording — view + tap events with client-side dedup (Task 5)
- [x] Admin 4-button review workflow + note requirement (Task 6)
- [x] Suspend/Reinstate button (Task 6)
- [x] Issue Refund button (visible only on rejected + paid/repayment_required) (Task 6)
- [x] Anomaly warning on admin review screen (Task 6)
- [x] Admin revenue chart — 6-month gross + net (Task 7)
- [x] Admin engagement stats — views, taps, tap rate for current month (Task 7)

**Not in this plan (in M4-Portal plan):**
- Advertiser signup/login
- Stripe Checkout (`/api/checkout`, `/api/webhooks/stripe`, `/api/resubmit`)
- Advertiser portal screens
