import { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Megaphone } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { FAB } from '@/components/ui/FAB';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { PromotionCard } from '@/components/tenant/PromotionCard';
import { usePromotions, type PromotionItem } from '@/hooks/usePromotions';
import { useAuth } from '@/lib/AuthContext';

const SEGMENTS = ['All', 'Tenant Offers', 'Local Deals'] as const;
type Segment = (typeof SEGMENTS)[number];

export default function PromotionsScreen() {
  const { propertyIds } = useAuth();
  const propertyId = propertyIds[0] ?? '';

  const [segment, setSegment] = useState<Segment>('All');

  const { data: promotions, isLoading, refetch, isRefetching } = usePromotions(
    propertyId,
    segment
  );

  const renderItem = useCallback(({ item }: { item: PromotionItem }) => {
    if (item.kind === 'tenant') {
      return (
        <View className="px-4 mb-3">
          <PromotionCard variant="tenant" data={item.data} />
        </View>
      );
    }
    return (
      <View className="px-4 mb-3">
        <PromotionCard variant="advertiser" data={item.data} />
      </View>
    );
  }, []);

  const keyExtractor = useCallback(
    (item: PromotionItem) =>
      item.kind === 'tenant' ? `tenant-${item.data.id}` : `adv-${item.data.id}`,
    []
  );

  if (isLoading && !promotions) {
    return <LoadingScreen message="Loading promotions..." />;
  }

  return (
    <View className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white mb-3">Promotions</Text>
        <SegmentedControl
          segments={SEGMENTS as unknown as string[]}
          selected={segment}
          onChange={(s) => setSegment(s as Segment)}
        />
      </GradientHeader>

      <FlatList
        data={promotions ?? []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={Megaphone}
            title="No promotions yet"
            message="Tenant offers and local deals will appear here."
          />
        }
      />

      <FAB onPress={() => router.push('/promotions/create')} />
    </View>
  );
}
