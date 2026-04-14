'use client';
import dynamic from 'next/dynamic';

const AnalyticsChart = dynamic(
  () => import('./AnalyticsChart').then((m) => m.AnalyticsChart),
  { ssr: false, loading: () => <div className="h-48 bg-gray-50 rounded animate-pulse" /> }
);

export { AnalyticsChart };
