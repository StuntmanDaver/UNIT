'use client';
import dynamic from 'next/dynamic';

const AnalyticsChart = dynamic(
  () => import('./AnalyticsChart').then((m) => m.AnalyticsChart),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-xl bg-[#F4F5F7]" /> }
);

export { AnalyticsChart };
