import { redirect } from 'next/navigation';
import Link from 'next/link';
import Stripe from 'stripe';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' });

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  if (!session_id) {
    redirect('/dashboard');
  }

  let confirmed = false;
  let promotionId: string | null = null;

  const authClient = await createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent'],
    });

    if (session.payment_status === 'paid') {
      promotionId = session.metadata?.promotionId ?? null;

      if (promotionId) {
        const supabase = createServiceRoleClient();

        const { data: currentPromo } = await supabase
          .from('promotions')
          .select('review_status, payment_status')
          .eq('id', promotionId)
          .eq('advertiser_id', user.id)
          .single();

        if (currentPromo && currentPromo.payment_status !== 'paid') {
          const paymentIntentId =
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id ?? null;

          await supabase
            .from('promotions')
            .update({
              payment_status: 'paid',
              review_status: 'pending',
              current_payment_intent_id: paymentIntentId,
            })
            .eq('id', promotionId)
            .eq('advertiser_id', user.id);

          await supabase
            .from('promotion_payment_attempts')
            .update({
              status: 'completed',
              stripe_payment_intent_id: paymentIntentId,
            })
            .eq('stripe_checkout_session_id', session.id);

          await supabase.from('promotion_status_events').insert({
            promotion_id: promotionId,
            from_review_status: currentPromo.review_status,
            to_review_status: 'pending',
            from_payment_status: currentPromo.payment_status,
            to_payment_status: 'paid',
            actor_type: 'system',
            actor_user_id: null,
            note: 'Reconciled by success page fallback',
          });
        }

        confirmed = Boolean(currentPromo);
      }
    }
  } catch (err) {
    console.error('[success] Stripe reconciliation failed:', err);
    // Fall through to neutral fallback card
  }

  if (confirmed) {
    return (
      <div className="unit-page flex items-center justify-center p-6">
        <div className="unit-card w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#465A75]">
            <span className="text-white text-3xl leading-none">&#10003;</span>
          </div>
          <h1 className="mb-4 text-2xl font-black">Submitted For Review</h1>
          <p className="mb-8 text-base text-[#465A75]">
            Payment confirmed. Admin typically responds within 1–2 business days.
          </p>
          <Link
            href="/dashboard"
            className="unit-btn unit-btn-primary"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="unit-page flex items-center justify-center p-6">
      <div className="unit-card w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#465A75]">
          <span className="text-white text-3xl leading-none">&#8226;</span>
        </div>
        <h1 className="mb-4 text-2xl font-black">Payment Received</h1>
        <p className="mb-8 text-base text-[#465A75]">
          Your promotion is being processed. Check your dashboard for status updates.
        </p>
        <Link
          href="/dashboard"
          className="unit-btn unit-btn-primary"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
