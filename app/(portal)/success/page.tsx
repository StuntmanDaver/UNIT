import { redirect } from 'next/navigation';
import Link from 'next/link';
import Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' });

// Brand tokens (from unit/CLAUDE.md — portal has no tailwind brand config yet,
// so we inline hex via Tailwind arbitrary values to keep the success page on-brand
// without requiring a portal-wide tailwind refactor).
const BG_NAVY = 'bg-[#101B29]';
const CARD_SURFACE = 'bg-[#1D263A]';
const BORDER_BLUE_40 = 'border-[#465A75]/40';
const TEXT_GRAY = 'text-[#E0E1DE]';
const TEXT_STEEL = 'text-[#7C8DA7]';
const BTN_BLUE = 'bg-[#465A75]';
const BTN_BLUE_HOVER = 'hover:bg-[#56688A]';

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
            .eq('id', promotionId);

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

          console.log(
            `[success] reconciled promotion ${promotionId} via Stripe session ${session.id}`
          );
        } else if (currentPromo) {
          console.log(
            `[success] promotion ${promotionId} already paid — webhook beat the success page for Stripe session ${session.id}`
          );
        }

        confirmed = true;
      }
    }
  } catch (err) {
    console.error('[success] Stripe reconciliation failed:', err);
    // Fall through to neutral fallback card
  }

  if (confirmed) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${BG_NAVY} p-6`}>
        <div
          className={`w-full max-w-md ${CARD_SURFACE} border ${BORDER_BLUE_40} rounded-2xl p-8 text-center`}
        >
          <div
            className={`w-16 h-16 ${BTN_BLUE} rounded-full flex items-center justify-center mx-auto mb-6`}
          >
            <span className="text-white text-3xl leading-none">&#10003;</span>
          </div>
          <h1 className={`text-2xl ${TEXT_GRAY} mb-4`}>Submitted for review</h1>
          <p className={`text-base ${TEXT_STEEL} mb-8`}>
            Payment confirmed. Admin typically responds within 1–2 business days.
          </p>
          <Link
            href="/dashboard"
            className={`inline-block ${BTN_BLUE} ${BTN_BLUE_HOVER} text-white px-6 py-3 rounded-lg text-base transition-colors`}
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${BG_NAVY} p-6`}>
      <div
        className={`w-full max-w-md ${CARD_SURFACE} border ${BORDER_BLUE_40} rounded-2xl p-8 text-center`}
      >
        <div
          className={`w-16 h-16 ${BTN_BLUE} rounded-full flex items-center justify-center mx-auto mb-6`}
        >
          <span className="text-white text-3xl leading-none">&#8226;</span>
        </div>
        <h1 className={`text-2xl ${TEXT_GRAY} mb-4`}>Payment received</h1>
        <p className={`text-base ${TEXT_STEEL} mb-8`}>
          Your promotion is being processed. Check your dashboard for status updates.
        </p>
        <Link
          href="/dashboard"
          className={`inline-block ${BTN_BLUE} ${BTN_BLUE_HOVER} text-white px-6 py-3 rounded-lg text-base transition-colors`}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
