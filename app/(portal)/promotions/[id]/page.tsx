import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ReviewStatusBadge, PaymentStatusBadge } from '@/components/StatusBadges';
import { PromotionCTA } from '@/components/PromotionCTA';
import { PromotionPreview } from '@/components/PromotionPreview';
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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-black">{promotion.headline}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <ReviewStatusBadge status={promotion.review_status} />
            <PaymentStatusBadge status={promotion.payment_status} />
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Link href={`/promotions/${id}/edit`}
              className="unit-btn unit-btn-secondary">
              Edit
            </Link>
          )}
        </div>
      </div>

      {/* Admin note */}
      {promotion.review_note && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-700 mb-1">Admin note</p>
          <p className="text-sm text-amber-800">{promotion.review_note}</p>
        </div>
      )}

      {/* CTA */}
      <div className="mb-5">
        <PromotionCTA promotion={promotion} />
      </div>

      {/* Details */}
      <div className="unit-card mb-5 p-5">
        <PromotionPreview promotion={promotion} />
        {promotion.description && (
          <p className="mb-3 mt-4 break-words text-sm text-[#101B29]">{promotion.description}</p>
        )}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[#465A75]">Start</span>
            <p className="font-bold text-[#101B29]">{promotion.start_date ?? '-'}</p>
          </div>
          <div>
            <span className="text-[#465A75]">End</span>
            <p className="font-bold text-[#101B29]">{promotion.end_date ?? '-'}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { label: 'Views', value: totalViews.toLocaleString() },
          { label: 'Taps', value: totalTaps.toLocaleString() },
          { label: 'Tap rate', value: tapRate },
        ].map(({ label, value }) => (
          <div key={label} className="unit-stat">
            <p className="text-xl font-black text-[#101B29]">{value}</p>
            <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-[#465A75]">{label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="unit-card p-5">
        <p className="mb-3 text-sm font-bold text-[#465A75]">Daily Performance</p>
        <AnalyticsChart data={chartData} />
      </div>
    </div>
  );
}
