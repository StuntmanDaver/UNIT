import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });

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

  // Process-then-mark idempotency. The previous pattern recorded the event
  // BEFORE running the handler — if the handler errored, the event was
  // permanently marked processed and Stripe's retries became no-ops.
  // Now we claim the row, look up completed_at, run the handler, and
  // only mark complete on success. See migration
  // 20260505000001_stripe_webhook_events_completed_at.sql for the column.
  await supabase
    .from('stripe_webhook_events')
    .insert({ id: event.id, type: event.type })
    // Claim the event id. Duplicate-key error is fine — another in-flight
    // call may have already claimed it; we still need to check completed_at.
    .then(() => undefined, () => undefined);

  const { data: existing } = await supabase
    .from('stripe_webhook_events')
    .select('completed_at')
    .eq('id', event.id)
    .maybeSingle();

  if (existing?.completed_at) {
    return NextResponse.json({ received: true });
  }

  const markComplete = async () => {
    const { error } = await supabase
      .from('stripe_webhook_events')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', event.id);
    if (error) {
      Sentry.captureException(error, {
        tags: { subsystem: 'stripe_webhook_mark_complete', stripe_event_type: event.type },
        extra: { stripeEventId: event.id },
      });
      throw error;
    }
  };

  // Audit-only failure handlers (US-013): never mutate promotions.payment_status
  // (the enum has no 'failed' value), only flip the matching attempt row to 'failed'.
  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session;
    await supabase
      .from('promotion_payment_attempts')
      .update({ status: 'failed' })
      .eq('stripe_checkout_session_id', session.id)
      .in('status', ['created'])
      .throwOnError();
    await markComplete();
    return NextResponse.json({ received: true });
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent;
    // Stripe Session metadata does not auto-propagate to PI metadata, so the
    // mobile Edge Function explicitly sets payment_intent_data.metadata with
    // the same promotionId. Older portal-advertiser flows do not set PI
    // metadata at all — fall through (received) so we don't poison those.
    const promotionId = intent.metadata?.promotionId;
    if (!promotionId) {
      await markComplete();
      return NextResponse.json({ received: true });
    }

    // Only the most recent 'created' attempt matches a single PI failure event.
    // If a user has retried, older 'created' attempts belong to abandoned
    // sessions and will be cleaned up by checkout.session.expired (24h timeout).
    const { data: attempt } = await supabase
      .from('promotion_payment_attempts')
      .select('id')
      .eq('promotion_id', promotionId)
      .eq('status', 'created')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (attempt) {
      await supabase
        .from('promotion_payment_attempts')
        .update({ status: 'failed', stripe_payment_intent_id: intent.id })
        .eq('id', attempt.id)
        .throwOnError();
    }

    await markComplete();
    return NextResponse.json({ received: true });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const promotionId = session.metadata?.promotionId;
    if (!promotionId) {
      await markComplete();
      return NextResponse.json({ received: true });
    }

    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

    // Fetch current promotion for the status event and admin notification
    const { data: currentPromo } = await supabase
      .from('promotions')
      .select('review_status, payment_status, property_id, headline, business_name')
      .eq('id', promotionId)
      .single();

    const alreadyMarkedPaid =
      currentPromo?.payment_status === 'paid' && currentPromo?.review_status === 'pending';

    // Update payment attempt
    await supabase
      .from('promotion_payment_attempts')
      .update({ status: 'completed', stripe_payment_intent_id: paymentIntentId })
      .eq('stripe_checkout_session_id', session.id)
      .throwOnError();

    // Update promotion
    await supabase
      .from('promotions')
      .update({
        payment_status: 'paid',
        review_status: 'pending',
        current_payment_intent_id: paymentIntentId,
      })
      .eq('id', promotionId)
      .throwOnError();

    // Insert status event only for the first successful writer. Mobile can
    // confirm the session directly as a fallback when this webhook is delayed.
    if (!alreadyMarkedPaid) {
      await supabase
        .from('promotion_status_events')
        .insert({
          promotion_id: promotionId,
          from_review_status: currentPromo?.review_status ?? 'draft',
          to_review_status: 'pending',
          from_payment_status: currentPromo?.payment_status ?? 'unpaid',
          to_payment_status: 'paid',
          actor_type: 'webhook',
          actor_user_id: null,
          note: null,
        })
        .throwOnError();
    }

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
          const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
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
          if (!pushResponse.ok) {
            Sentry.captureMessage('Stripe webhook admin push notification failed', {
              level: 'warning',
              tags: { subsystem: 'stripe_webhook_admin_push', stripe_event_type: event.type },
              extra: { stripeEventId: event.id, promotionId, status: pushResponse.status },
            });
          }
        }

        // In-app notification records so admins see it in the notifications tab
        const { error: notificationError } = await supabase.from('notifications').insert(
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
        if (notificationError) {
          Sentry.captureException(notificationError, {
            tags: { subsystem: 'stripe_webhook_admin_notification', stripe_event_type: event.type },
            extra: { stripeEventId: event.id, promotionId, propertyId },
          });
        }
      }
    }
  }

  // Mark this event as fully processed so subsequent retries dedup.
  // Reached for: checkout.session.completed (full path) and any
  // unhandled event.type that fell through.
  await markComplete();

  return NextResponse.json({ received: true });
}
