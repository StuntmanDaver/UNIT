// supabase/functions/create-promotion-checkout-session/index.ts
//
// Creates or confirms a Stripe Checkout Session for a tenant-submitted promotion.
// Called by the mobile app when the tenant taps "Pay Now" on their draft
// promotion. The existing portal webhook (portal/app/api/webhooks/stripe/route.ts)
// handles checkout.session.completed for all promotions — no separate webhook needed.
//
// POST body: { promotionId: string, priceTierId: string }
// Returns:   { url: string, sessionId: string }
//
// POST body: { action: 'confirm', promotionId: string, sessionId: string }
// Returns:   { paid: boolean, paymentStatus?: string, reviewStatus?: string }
//
// Stripe customer handling: tenants do NOT have stripe_customer_id (only
// advertiser_profiles does). Pass customer_email so Stripe creates the customer
// on the fly — do NOT add stripe_customer_id to profiles in this milestone.
//
// Deep-link URLs use MOBILE_APP_URL (unit-staging:// in staging, unit:// in
// production) so the in-app browser returns control to the matching app.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@22?target=deno';
import { captureEdgeException } from '../_shared/sentry.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2026-04-22.dahlia',
});

function getMobileDeepLinkBase(): string {
  const configuredUrl = Deno.env.get('MOBILE_APP_URL') ?? 'unit://';
  if (configuredUrl.endsWith('://') || configuredUrl.endsWith('/')) {
    return configuredUrl;
  }
  return `${configuredUrl}/`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // ── 1. Authenticate calling user via Authorization JWT ──────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── 2. Parse request body ───────────────────────────────────────────────────
  let action: string | undefined;
  let promotionId: string;
  let priceTierId: string | undefined;
  let sessionId: string | undefined;
  try {
    const body = await req.json();
    action = body.action;
    promotionId = body.promotionId;
    priceTierId = body.priceTierId;
    sessionId = body.sessionId;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!promotionId || typeof promotionId !== 'string') {
    return new Response(JSON.stringify({ error: 'promotionId is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Service-role client bypasses RLS for the ownership and tier lookups below
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // ── 3. Verify promotion belongs to calling user ─────────────────────────────
  const { data: promotion, error: promoError } = await adminClient
    .from('promotions')
    .select('id, advertiser_id, payment_status, review_status, property_id, headline')
    .eq('id', promotionId)
    .single();

  if (promoError || !promotion) {
    return new Response(JSON.stringify({ error: 'Promotion not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (promotion.advertiser_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (action === 'confirm') {
    if (!sessionId || typeof sessionId !== 'string') {
      return new Response(JSON.stringify({ error: 'sessionId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'],
      });
    } catch (stripeErr: unknown) {
      await captureEdgeException(stripeErr, {
        functionName: 'create-promotion-checkout-session',
        userId: user.id,
        tags: { subsystem: 'stripe_checkout_confirm' },
        extra: { promotionId, sessionId },
      });
      const msg = stripeErr instanceof Error ? stripeErr.message : 'Could not verify checkout session';
      return new Response(JSON.stringify({ error: msg }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (session.metadata?.promotionId !== promotionId) {
      return new Response(JSON.stringify({ error: 'Checkout session does not match promotion' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (session.status !== 'complete' || session.payment_status !== 'paid') {
      return new Response(JSON.stringify({ paid: false }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

    await adminClient
      .from('promotion_payment_attempts')
      .update({ status: 'completed', stripe_payment_intent_id: paymentIntentId })
      .eq('stripe_checkout_session_id', session.id)
      .throwOnError();

    if (promotion.payment_status !== 'paid' || promotion.review_status !== 'pending') {
      await adminClient
        .from('promotions')
        .update({
          payment_status: 'paid',
          review_status: 'pending',
          current_payment_intent_id: paymentIntentId,
        })
        .eq('id', promotionId)
        .throwOnError();

      await adminClient
        .from('promotion_status_events')
        .insert({
          promotion_id: promotionId,
          from_review_status: promotion.review_status ?? 'draft',
          to_review_status: 'pending',
          from_payment_status: promotion.payment_status ?? 'unpaid',
          to_payment_status: 'paid',
          actor_type: 'webhook',
          actor_user_id: null,
          note: null,
        })
        .throwOnError();
    }

    return new Response(JSON.stringify({ paid: true, paymentStatus: 'paid', reviewStatus: 'pending' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!priceTierId || typeof priceTierId !== 'string') {
    return new Response(JSON.stringify({ error: 'priceTierId is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (promotion.payment_status === 'paid') {
    return new Response(JSON.stringify({ error: 'Promotion is already paid' }), {
      status: 422,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── 4. Look up the selected price tier ─────────────────────────────────────
  const { data: tier, error: tierError } = await adminClient
    .from('promotion_price_tiers')
    .select('id, name, duration_days, is_featured, price_cents, currency')
    .eq('id', priceTierId)
    .eq('is_active', true)
    .single();

  if (tierError || !tier) {
    return new Response(JSON.stringify({ error: 'Price tier not found or inactive' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── 5. Create Stripe Checkout Session ───────────────────────────────────────
  // payment mode (not subscription). customer_email lets Stripe create a
  // customer on the fly — tenants have no stripe_customer_id on their profile.
  // Metadata must include promotionId so the existing portal webhook can update
  // the promotions row when checkout.session.completed fires.
  let session: Stripe.Checkout.Session;
  const mobileDeepLinkBase = getMobileDeepLinkBase();
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: tier.currency,
            unit_amount: tier.price_cents,
            product_data: {
              name: tier.name,
              description: `${tier.duration_days}-day promotion${tier.is_featured ? ' (Featured)' : ''}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${mobileDeepLinkBase}promotions/${promotionId}?status=success`,
      cancel_url: `${mobileDeepLinkBase}promotions/${promotionId}?status=cancel`,
      metadata: {
        promotionId,
        priceTierId,
        userId: user.id,
        source: 'mobile_tenant',
      },
      // Propagate metadata to the underlying PaymentIntent so the portal's
      // payment_intent.payment_failed audit handler can match the row.
      // Stripe does NOT copy Session metadata to PI metadata by default.
      payment_intent_data: {
        metadata: {
          promotionId,
          priceTierId,
          userId: user.id,
          source: 'mobile_tenant',
        },
      },
    });
  } catch (stripeErr: unknown) {
    await captureEdgeException(stripeErr, {
      functionName: 'create-promotion-checkout-session',
      userId: user.id,
      tags: { subsystem: 'stripe_checkout' },
      extra: { promotionId, priceTierId },
    });
    const msg = stripeErr instanceof Error ? stripeErr.message : 'Failed to create checkout session';
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── 6. Record the payment attempt ───────────────────────────────────────────
  // status='created' matches the check constraint ('created','completed','failed','canceled','refunded').
  // attempt_type='repayment' is used when payment_status='repayment_required'.
  const attemptType = promotion.payment_status === 'repayment_required' ? 'repayment' : 'initial';
  const { error: attemptError } = await adminClient
    .from('promotion_payment_attempts')
    .insert({
      promotion_id: promotionId,
      stripe_checkout_session_id: session.id,
      amount_cents: tier.price_cents,
      status: 'created',
      attempt_type: attemptType,
      price_tier_id: priceTierId,
    });

  if (attemptError) {
    // Log but don't block — Stripe session is already created and the webhook
    // will still complete the payment even if the attempt row is missing.
    console.error('Failed to insert payment attempt:', attemptError.message);
    await captureEdgeException(attemptError, {
      functionName: 'create-promotion-checkout-session',
      level: 'warning',
      userId: user.id,
      tags: { subsystem: 'payment_attempt_audit' },
      extra: { promotionId, priceTierId, sessionId: session.id },
    });
  }

  return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
