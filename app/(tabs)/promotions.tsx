// app/(tabs)/promotions.tsx
import { useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, RefreshControl, ViewToken } from 'react-native';
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
import { analyticsService } from '@/services/analytics';

const SEGMENTS = ['All', 'Tenant Offers', 'Local Deals'] as const;
type Segment = (typeof SEGMENTS)[number];

const SESSION_ID = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export default function PromotionsScreen() {
  const { propertyIds, user } = useAuth();
  const propertyId = propertyIds[0] ?? '';
  const [segment, setSegment] = useState<Segment>('All');
  const viewedRef = useRef(new Set<string>());

  const { data: promotions, isLoading, refetch, isRefetching } = usePromotions(
    propertyId,
    segment
  );

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!user?.id) return;
      for (const { item } of viewableItems) {
        const typedItem = item as PromotionItem;
        if (typedItem.kind !== 'advertiser') continue;
        const promoId = typedItem.data.id;
        if (viewedRef.current.has(promoId)) continue;
        viewedRef.current.add(promoId);
        analyticsService.recordView(promoId, user.id, propertyId, SESSION_ID).catch(() => {});
      }
    },
    [user?.id, propertyId]
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleTap = useCallback(
    (item: PromotionItem) => {
      if (item.kind === 'advertiser' && user?.id) {
        analyticsService.recordTap(item.data.id, user.id, propertyId, SESSION_ID).catch(() => {});
      }
    },
    [user?.id, propertyId]
  );

  const renderItem = useCallback(
    ({ item }: { item: PromotionItem }) => {
      if (item.kind === 'tenant') {
        return (
          <View className="px-4 mb-3">
            <PromotionCard variant="tenant" data={item.data} />
          </View>
        );
      }
      return (
        <View className="px-4 mb-3">
          <PromotionCard
            variant="advertiser"
            data={item.data}
            onPress={() => handleTap(item)}
          />
        </View>
      );
    },
    [handleTap]
  );

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
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
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
