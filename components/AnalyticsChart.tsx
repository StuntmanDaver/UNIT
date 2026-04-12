'use client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format, parseISO } from 'date-fns';

type DayData = { date: string; views: number; taps: number };

export function AnalyticsChart({ data }: { data: DayData[] }) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
        No analytics data yet
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), 'MMM d'),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="views" fill="#3B82F6" name="Views" radius={[2, 2, 0, 0]} />
        <Bar dataKey="taps" fill="#10B981" name="Taps" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
