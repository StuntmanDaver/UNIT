import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-11-20.acacia' });
const PLACEMENT_FEE_CENTS = 4999;

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { promotionId, attemptType = 'initial' } = await req.json();

  // Validate ownership
  const { data: promotion } = await supabase
    .from('promotions')
    .select('id, advertiser_id, headline')
    .eq('id', promotionId)
    .eq('advertiser_id', user.id)
    .single();
  if (!promotion) return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });

  const serviceClient = createServiceRoleClient();

  // Get or create Stripe Customer
  const { data: profile } = await serviceClient
    .from('advertiser_profiles')
    .select('stripe_customer_id, contact_email')
    .eq('id', user.id)
    .single();

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
        currency: 'usd',
        unit_amount: PLACEMENT_FEE_CENTS,
        product_data: { name: `Promotion: ${promotion.headline}` },
      },
      quantity: 1,
    }],
    success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/promotions/${promotionId}?canceled=true`,
    metadata: { promotionId },
  });

  // Insert payment attempt
  await serviceClient.from('promotion_payment_attempts').insert({
    promotion_id: promotionId,
    stripe_checkout_session_id: session.id,
    amount_cents: PLACEMENT_FEE_CENTS,
    status: 'created',
    attempt_type: attemptType,
  });

  return NextResponse.json({ url: session.url });
}
