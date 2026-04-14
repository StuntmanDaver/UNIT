import { notFound } from 'next/navigation';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ReviewStatusBadge, PaymentStatusBadge } from '@/components/StatusBadges';
import { PromotionCTA } from '@/components/PromotionCTA';
import { AnalyticsChart } from '@/components/AnalyticsChartWrapper';
import type { Promotion, AdAnalyticsRow } from '@/lib/supabase/types';

type DayData = { date: string; views: number; taps: number };

function buildChartData(rows: AdAnalyticsRow[]): DayData[] {
  const byDay: Record<string, { views: number; taps: number }> = {};
  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    if (!byDay[day]) byDay[day] = { views: 0, taps: 0 };
    if (row.event_type === 'view') byDay[day].views++;
    else byDay[day].taps++;
  }
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));
}

export default async function PromotionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const authClient = await createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();

  const supabase = createServiceRoleClient();
  // Fetch promotion and analytics in parallel
  const [promoResult, analyticsResult] = await Promise.all([
    supabase
      .from('promotions')
      .select('*')
      .eq('id', id)
      .eq('advertiser_id', user?.id ?? '')
      .single(),
    supabase
      .from('ad_analytics')
      .select('event_type, created_at')
      .eq('promotion_id', id)
      .order('created_at', { ascending: true }),
  ]);

  if (!promoResult.data) notFound();

  const promotion = promoResult.data as Promotion;
  const analyticsRows = (analyticsResult.data ?? []) as AdAnalyticsRow[];

  const totalViews = analyticsRows.filter((r) => r.event_type === 'view').length;
  const totalTaps = analyticsRows.filter((r) => r.event_type === 'tap').length;
  const tapRate = totalViews > 0 ? `${((totalTaps / totalViews) * 100).toFixed(1)}%` : '—';
  const chartData = buildChartData(analyticsRows);

  const canEdit =
    promotion.review_status === 'draft' ||
    promotion.review_status === 'revision_requested';

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{promotion.headline}</h1>
          <div className="flex gap-2 mt-2">
            <ReviewStatusBadge status={promotion.review_status} />
            <PaymentStatusBadge status={promotion.payment_status} />
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <a href={`/promotions/${id}/edit`}
              className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50">
              Edit
            </a>
          )}
        </div>
      </div>

      {/* Admin note */}
      {promotion.review_note && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <p className="text-xs font-semibold text-amber-700 mb-1">Admin note</p>
          <p className="text-sm text-amber-800">{promotion.review_note}</p>
        </div>
      )}

      {/* CTA */}
      <div className="mb-5">
        <PromotionCTA promotion={promotion} />
      </div>

      {/* Details */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
        {promotion.description && (
          <p className="text-sm text-gray-700 mb-3">{promotion.description}</p>
        )}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Start</span>
            <p className="font-medium text-gray-900">{promotion.start_date ?? '—'}</p>
          </div>
          <div>
            <span className="text-gray-500">End</span>
            <p className="font-medium text-gray-900">{promotion.end_date ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Views', value: totalViews.toLocaleString() },
          { label: 'Taps', value: totalTaps.toLocaleString() },
          { label: 'Tap rate', value: tapRate },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Daily performance</p>
        <AnalyticsChart data={chartData} />
      </div>
    </div>
  );
}
