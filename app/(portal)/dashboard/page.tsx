export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ReviewStatusBadge, PaymentStatusBadge } from '@/components/StatusBadges';
import type { Promotion, AdvertiserProfile } from '@/lib/supabase/types';

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        {canSubmit ? (
          <Link
            href="/promotions/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
            + New Promotion
          </Link>
        ) : (
          <button
            disabled
            title="Your account is pending admin approval"
            className="bg-blue-300 text-white px-4 py-2 rounded-lg text-sm font-semibold cursor-not-allowed"
          >
            + New Promotion
          </button>
        )}
      </div>

      {attempts.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Spent', value: `$${totalSpent.toFixed(2)}` },
            { label: 'Views', value: totalViews.toLocaleString() },
            { label: 'Taps', value: totalTaps.toLocaleString() },
            { label: 'Tap Rate', value: tapRate },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl p-4 shadow-sm text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
          ))}
        </div>
      )}

      {promotions.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">No promotions yet</p>
          {canSubmit && (
            <p className="text-sm">
              <Link href="/promotions/new" className="text-blue-600 hover:underline">
                Submit your first promotion
              </Link>
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {promotions.map((promo) => {
            const needsPayment = promo.review_status === 'draft' && promo.payment_status === 'unpaid';
            const href = needsPayment
              ? `/promotions/new/review?id=${promo.id}`
              : `/promotions/${promo.id}`;
            return (
              <Link
                key={promo.id}
                href={href}
                className="block bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{promo.headline}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {promo.start_date} → {promo.end_date}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <ReviewStatusBadge status={promo.review_status} />
                    <PaymentStatusBadge status={promo.payment_status} />
                  </div>
                </div>
                {needsPayment && (
                  <div className="mt-3 pt-3 border-t border-amber-100 flex items-center justify-between">
                    <p className="text-xs text-amber-700 font-medium">Payment required to submit for review</p>
                    <span className="text-xs text-blue-600 font-semibold">Complete payment →</span>
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
