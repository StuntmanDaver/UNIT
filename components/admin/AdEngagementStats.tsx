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
      <View className="flex-1 bg-brand-mist rounded-xl p-4 shadow-sm border border-brand-blue/40">
        <Text className="text-2xl font-lora-semibold text-brand-ink">{data.totalViews.toLocaleString()}</Text>
        <Text className="text-sm font-nunito text-brand-ink mt-1">Views (this month)</Text>
      </View>
      <View className="flex-1 bg-brand-mist rounded-xl p-4 shadow-sm border border-brand-blue/40">
        <Text className="text-2xl font-lora-semibold text-brand-ink">{data.totalTaps.toLocaleString()}</Text>
        <Text className="text-sm font-nunito text-brand-ink mt-1">Taps (this month)</Text>
      </View>
      <View className="flex-1 bg-brand-mist rounded-xl p-4 shadow-sm border border-brand-blue/40">
        <Text className="text-2xl font-lora-semibold text-brand-ink">{tapRate}</Text>
        <Text className="text-sm font-nunito text-brand-ink mt-1">Tap rate</Text>
      </View>
    </View>
  );
}
