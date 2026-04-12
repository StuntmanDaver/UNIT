// components/admin/AdEngagementStats.tsx
import { View, Text } from 'react-native';
import type { AdEngagement } from '@/hooks/usePromotionStats';

type Props = { data: AdEngagement };

export function AdEngagementStats({ data }: Props) {
  const tapRate =
    data.totalViews > 0
      ? `${((data.totalTaps / data.totalViews) * 100).toFixed(1)}%`
      : '—';

  return (
    <View className="flex-row gap-3">
      <View className="flex-1 bg-white rounded-xl p-4 shadow-sm">
        <Text className="text-2xl font-bold text-brand-navy">{data.totalViews.toLocaleString()}</Text>
        <Text className="text-xs text-brand-steel mt-1">Views (this month)</Text>
      </View>
      <View className="flex-1 bg-white rounded-xl p-4 shadow-sm">
        <Text className="text-2xl font-bold text-brand-navy">{data.totalTaps.toLocaleString()}</Text>
        <Text className="text-xs text-brand-steel mt-1">Taps (this month)</Text>
      </View>
      <View className="flex-1 bg-white rounded-xl p-4 shadow-sm">
        <Text className="text-2xl font-bold text-brand-navy">{tapRate}</Text>
        <Text className="text-xs text-brand-steel mt-1">Tap rate</Text>
      </View>
    </View>
  );
}
