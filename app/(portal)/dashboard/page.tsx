export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ReviewStatusBadge, PaymentStatusBadge } from '@/components/StatusBadges';
import type { Promotion, AdvertiserProfile } from '@/lib/supabase/types';
import { getReviewHref } from '@/lib/promotion-display';

async function getAdvertiserData(userId: string) {
  const supabase = createServiceRoleClient();

  const [profileResult, promotionsResult, attemptsResult, analyticsResult] = await Promise.all([
    supabase
      .from('advertiser_profiles')
      .select('*')
      .eq('id', userId)
      .single(),
    supabase
      .from('promotions')
      .select('*')
      .eq('advertiser_id', userId)
      .order('created_at', { ascending: false }),
    supabase.from('promotion_payment_attempts')
      .select('amount_cents, promotions!inner(advertiser_id)')
      .eq('promotions.advertiser_id', userId)
      .eq('status', 'completed'),
    supabase.from('ad_analytics')
      .select('event_type, promotions!inner(advertiser_id)')
      .eq('promotions.advertiser_id', userId),
  ]);

  return {
    profile: profileResult.data as AdvertiserProfile | null,
    promotions: (promotionsResult.data ?? []) as Promotion[],
    attempts: (attemptsResult.data ?? []) as { amount_cents: number }[],
    analytics: (analyticsResult.data ?? []) as { event_type: string }[],
  };
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { profile, promotions, attempts, analytics } = await getAdvertiserData(user.id);

  const totalSpent = attempts.reduce((sum, a) => sum + a.amount_cents, 0) / 100;
  const totalViews = analytics.filter((r) => r.event_type === 'view').length;
  const totalTaps = analytics.filter((r) => r.event_type === 'tap').length;
  const tapRate = totalViews > 0 ? `${((totalTaps / totalViews) * 100).toFixed(1)}%` : '—';

  const canSubmit = profile?.status === 'active';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Dashboard</h1>
          <p className="mt-1 text-sm text-[#465A75]">Manage promotion drafts, payments, and performance.</p>
        </div>
        {canSubmit ? (
          <Link
            href="/promotions/new"
            className="unit-btn unit-btn-primary shrink-0"
          >
            New Promotion
          </Link>
        ) : (
          <button
            disabled
            title="Your account is pending admin approval"
            className="unit-btn unit-btn-primary shrink-0"
          >
            New Promotion
          </button>
        )}
      </div>

      {attempts.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total Spent', value: `$${totalSpent.toFixed(2)}` },
            { label: 'Views', value: totalViews.toLocaleString() },
            { label: 'Taps', value: totalTaps.toLocaleString() },
            { label: 'Tap Rate', value: tapRate },
          ].map(({ label, value }) => (
            <div key={label} className="unit-stat">
              <p className="text-xs font-bold uppercase tracking-wide text-[#465A75]">{label}</p>
              <p className="mt-1 text-2xl font-black text-[#101B29]">{value}</p>
            </div>
          ))}
        </div>
      )}

      {promotions.length === 0 ? (
        <div className="unit-card py-16 text-center">
          <p className="mb-2 text-lg font-black text-[#101B29]">No Promotions Yet</p>
          {canSubmit && (
            <p className="text-sm">
              <Link href="/promotions/new" className="unit-link">
                Submit Your First Promotion
              </Link>
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {promotions.map((promo) => {
            const needsPayment = promo.review_status === 'draft' && promo.payment_status === 'unpaid';
            const href = needsPayment
              ? getReviewHref(promo.id)
              : `/promotions/${promo.id}`;
            return (
              <Link
                key={promo.id}
                href={href}
                className="unit-card block p-5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#465A75]/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    {promo.image_url && (
                      <div
                        aria-label="Promotion thumbnail"
                        className="h-14 w-20 shrink-0 rounded-xl border border-[#E5E7EB] bg-[#F4F5F7] bg-cover bg-center"
                        style={{ backgroundImage: `url(${promo.image_url})` }}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[#101B29]">{promo.headline}</p>
                      <p className="mt-0.5 text-sm text-[#465A75]">
                        {promo.start_date} - {promo.end_date}
                      </p>
                      {(promo.cta_text || promo.cta_link) && (
                        <p className="mt-1 truncate text-xs font-medium text-[#465A75]">
                          CTA: {promo.cta_text || promo.cta_link}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    <ReviewStatusBadge status={promo.review_status} />
                    <PaymentStatusBadge status={promo.payment_status} />
                  </div>
                </div>
                {needsPayment && (
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-amber-100 pt-3">
                    <p className="text-xs text-amber-700 font-medium">Payment required to submit for review</p>
                    <span className="text-xs font-bold text-[#465A75]">Complete Payment</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
