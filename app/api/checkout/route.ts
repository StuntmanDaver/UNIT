import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import {
  derivePromotionPaymentAttemptType,
  getActivePromotionPriceTier,
} from '@/lib/promotions/payments';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' });

const checkoutRequestSchema = z.object({
  promotionId: z.string().trim().min(1),
  priceTierId: z.string().trim().min(1),
});

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: z.infer<typeof checkoutRequestSchema>;
  try {
    const result = checkoutRequestSchema.safeParse(await req.json());
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid checkout request' }, { status: 400 });
    }
    body = result.data;
  } catch {
    return NextResponse.json({ error: 'Invalid checkout request' }, { status: 400 });
  }

  const serviceClient = createServiceRoleClient();

  // Validate ownership and fetch advertiser profile in parallel
  const [{ data: promotion }, { data: profile }] = await Promise.all([
    supabase
      .from('promotions')
      .select('id, advertiser_id, headline, review_status, payment_status')
      .eq('id', body.promotionId)
      .eq('advertiser_id', user.id)
      .single(),
    serviceClient
      .from('advertiser_profiles')
      .select('status, stripe_customer_id, contact_email')
      .eq('id', user.id)
      .single(),
  ]);
  if (!promotion) return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
  if (!profile || profile.status !== 'active') {
    return NextResponse.json({ error: 'Advertiser account inactive' }, { status: 403 });
  }

  if (promotion.payment_status === 'paid') {
    return NextResponse.json({ error: 'Promotion is already paid' }, { status: 409 });
  }

  const attemptType = derivePromotionPaymentAttemptType(promotion);
  if (!attemptType) {
    return NextResponse.json({ error: 'Promotion is not eligible for checkout' }, { status: 422 });
  }

  const priceTier = await getActivePromotionPriceTier(serviceClient, body.priceTierId);
  if (!priceTier) {
    return NextResponse.json({ error: 'Price tier not found' }, { status: 404 });
  }

  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: profile?.contact_email ?? user.email });
    customerId = customer.id;
    await serviceClient
      .from('advertiser_profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: priceTier.currency.toLowerCase(),
        unit_amount: priceTier.price_cents,
        product_data: { name: `${priceTier.name}: ${promotion.headline}` },
      },
      quantity: 1,
    }],
    success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/promotions/new/review?id=${body.promotionId}&canceled=true`,
    metadata: {
      promotionId: body.promotionId,
      priceTierId: priceTier.id,
      attemptType,
    },
    // Stripe Session metadata does not auto-propagate to the underlying
    // PaymentIntent. Set it explicitly so the webhook's
    // payment_intent.payment_failed audit handler can match the row.
    payment_intent_data: {
      metadata: {
        promotionId: body.promotionId,
        priceTierId: priceTier.id,
        attemptType,
      },
    },
  });

  // Insert payment attempt
  const { error: attemptError } = await serviceClient.from('promotion_payment_attempts').insert({
    promotion_id: body.promotionId,
    price_tier_id: priceTier.id,
    stripe_checkout_session_id: session.id,
    amount_cents: priceTier.price_cents,
    status: 'created',
    attempt_type: attemptType,
  });
  if (attemptError) {
    return NextResponse.json({ error: 'Unable to record payment attempt' }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
