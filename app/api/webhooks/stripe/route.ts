import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' });

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // Idempotency: skip if already processed
  const { error: insertError } = await supabase
    .from('stripe_webhook_events')
    .insert({ id: event.id, type: event.type });
  if (insertError) {
    // Duplicate key — already processed
    return NextResponse.json({ received: true });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const promotionId = session.metadata?.promotionId;
    if (!promotionId) return NextResponse.json({ received: true });

    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

    // Fetch current promotion for the status event and admin notification
    const { data: currentPromo } = await supabase
      .from('promotions')
      .select('review_status, payment_status, property_id, headline, business_name')
      .eq('id', promotionId)
      .single();

    // Update payment attempt
    await supabase
      .from('promotion_payment_attempts')
      .update({ status: 'completed', stripe_payment_intent_id: paymentIntentId })
      .eq('stripe_checkout_session_id', session.id);

    // Update promotion
    await supabase
      .from('promotions')
      .update({
        payment_status: 'paid',
        review_status: 'pending',
        current_payment_intent_id: paymentIntentId,
      })
      .eq('id', promotionId);

    // Insert status event
    await supabase.from('promotion_status_events').insert({
      promotion_id: promotionId,
      from_review_status: currentPromo?.review_status ?? 'draft',
      to_review_status: 'pending',
      from_payment_status: currentPromo?.payment_status ?? 'unpaid',
      to_payment_status: 'paid',
      actor_type: 'webhook',
      actor_user_id: null,
      note: null,
    });

    // Notify admins who manage this property
    const propertyId = currentPromo?.property_id;
    if (propertyId) {
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id, email, push_token')
        .eq('role', 'landlord')
        .contains('property_ids', [propertyId]);

      if (adminProfiles && adminProfiles.length > 0) {
        const notifTitle = 'New Promotion Pending Review';
        const notifBody = `${currentPromo?.business_name ?? 'An advertiser'} submitted "${currentPromo?.headline ?? 'a promotion'}" — tap to review.`;

        // Push notifications to admins that have a token
        const tokens = adminProfiles
          .map((p: { push_token: string | null }) => p.push_token)
          .filter((t): t is string => t !== null);

        if (tokens.length > 0) {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
              tokens.map((token) => ({
                to: token,
                title: notifTitle,
                body: notifBody,
                data: { type: 'advertiser_approved', promotionId },
                sound: 'default',
              }))
            ),
          });
        }

        // In-app notification records so admins see it in the notifications tab
        await supabase.from('notifications').insert(
          adminProfiles.map((p: { id: string; email: string }) => ({
            user_id: p.id,
            user_email: p.email,
            property_id: propertyId,
            type: 'advertiser_approved',
            title: notifTitle,
            message: notifBody,
            data: { promotionId },
            read: false,
          }))
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}
