// supabase/functions/issue-refund/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@17?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-11-20.acacia' });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Authenticate request — must be a logged-in admin
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify landlord role
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'landlord') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let promotionId: string;
  let reason: string;
  try {
    const body = await req.json();
    promotionId = body.promotionId;
    reason = body.reason;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!promotionId || typeof promotionId !== 'string') {
    return new Response(JSON.stringify({ error: 'promotionId is required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!reason || typeof reason !== 'string') {
    return new Response(JSON.stringify({ error: 'reason is required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 1. Validate promotion is in refundable state
  const { data: promotion, error: promoError } = await adminClient
    .from('promotions')
    .select('id, payment_status, review_status')
    .eq('id', promotionId)
    .single();

  if (promoError || !promotion) {
    return new Response(JSON.stringify({ error: 'Promotion not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (promotion.review_status !== 'rejected') {
    return new Response(
      JSON.stringify({ error: 'Refund only available for rejected promotions' }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  if (!['paid', 'repayment_required'].includes(promotion.payment_status)) {
    return new Response(
      JSON.stringify({ error: 'No paid amount to refund' }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // 2. Find most recent completed payment attempt
  const { data: attempt, error: attemptError } = await adminClient
    .from('promotion_payment_attempts')
    .select('id, stripe_payment_intent_id')
    .eq('promotion_id', promotionId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (attemptError || !attempt?.stripe_payment_intent_id) {
    return new Response(
      JSON.stringify({ error: 'No completed payment found for this promotion' }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // 3. Call Stripe Refunds API
  try {
    await stripe.refunds.create({ payment_intent: attempt.stripe_payment_intent_id });
  } catch (stripeError: unknown) {
    const msg = stripeError instanceof Error ? stripeError.message : 'Stripe refund failed';
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const now = new Date().toISOString();

  // 4. Update promotion
  const { error: updatePromoError } = await adminClient
    .from('promotions')
    .update({
      payment_status: 'refunded',
      refunded_at: now,
      refunded_by: user.id,
      refund_reason: reason,
    })
    .eq('id', promotionId);

  if (updatePromoError) {
    return new Response(
      JSON.stringify({ error: 'Stripe refund issued but failed to update promotion record' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // 5. Update payment attempt
  const { error: updateAttemptError } = await adminClient
    .from('promotion_payment_attempts')
    .update({ status: 'refunded' })
    .eq('id', attempt.id);

  if (updateAttemptError) {
    return new Response(
      JSON.stringify({ error: 'Stripe refund issued but failed to update payment attempt record' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // 6. Insert status event
  const { error: insertEventError } = await adminClient
    .from('promotion_status_events')
    .insert({
      promotion_id: promotionId,
      from_review_status: promotion.review_status,
      to_review_status: promotion.review_status,  // review_status unchanged
      from_payment_status: promotion.payment_status,
      to_payment_status: 'refunded',
      actor_user_id: user.id,
      actor_type: 'admin',
      note: reason,
    });

  if (insertEventError) {
    return new Response(
      JSON.stringify({ error: 'Stripe refund issued but failed to insert status event' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
