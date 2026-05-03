import { useCallback } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { Inbox } from 'lucide-react-native';
import { router } from 'expo-router';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { ActivityFeedCard } from '@/components/tenant/ActivityFeedCard';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { useAuth } from '@/lib/AuthContext';
import type { ActivityFeedItem } from '@/services/activityFeed';

/**
 * Skeleton placeholder card shown while the feed is loading.
 * Uses brand-mist / brand-paper tokens — permitted on the Home Feed
 * per the light-surface design rules in CLAUDE.md.
 */
function SkeletonCard() {
  return (
    <View
      className="mx-4 mb-4 bg-brand-mist border border-brand-paper rounded-2xl p-4"
      style={{ minHeight: 88 }}
    >
      <View className="bg-brand-paper rounded-xl mb-3" style={{ width: 80, height: 12 }} />
      <View className="bg-brand-paper rounded-xl mb-2" style={{ height: 24 }} />
      <View
        className="bg-brand-paper rounded-xl mb-1"
        style={{ height: 16, marginRight: 48 }}
      />
      <View className="bg-brand-paper rounded-xl" style={{ height: 16, width: '55%' }} />
    </View>
  );
}

/**
 * Empty state tuned for the light (brand-cloud) background.
 * Uses brand-ink / brand-ink-muted text to meet AA contrast on white cards.
 * The generic EmptyState component uses text-brand-gray which fails AA on
 * bg-brand-mist (white), so we use inline text here.
 */
function HomeFeedEmpty() {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <View className="w-16 h-16 rounded-full bg-brand-mist border border-brand-paper items-center justify-center mb-4">
        <Inbox size={32} color="#465A75" />
      </View>
      <Text className="text-2xl font-lora-semibold text-brand-ink leading-tight mb-2 text-center">
        No activity yet
      </Text>
      <Text className="text-base font-nunito text-brand-ink-muted leading-relaxed text-center">
        No activity yet — check back soon.
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const { propertyIds } = useAuth();
  const propertyId = propertyIds[0] ?? '';

  // feedIds drives both My Property (one id) and Nearby (origin + cluster ids
  // from useNearbyPropertyIds, added in US-008). Default is current property only.
  const feedIds = propertyId ? [propertyId] : [];

  const { data: items, isLoading, refetch, isRefetching } = useActivityFeed(feedIds);

  const handlePress = useCallback((item: ActivityFeedItem) => {
    if (item.ctaRoute) {
      router.push(item.ctaRoute as Parameters<typeof router.push>[0]);
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ActivityFeedItem }) => (
      <View className="px-4 mb-4">
        <ActivityFeedCard
          item={item}
          onPress={item.ctaRoute ? () => handlePress(item) : undefined}
        />
      </View>
    ),
    [handlePress]
  );

  const keyExtractor = useCallback(
    (item: ActivityFeedItem) => `${item.kind}-${item.id}`,
    []
  );

  if (isLoading && !items) {
    return (
      <View className="flex-1 bg-brand-cloud">
        <GradientHeader>
          <Text className="font-lora-semibold text-3xl text-white leading-tight">Home</Text>
        </GradientHeader>
        <View className="pt-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-cloud">
      <GradientHeader>
        <Text className="font-lora-semibold text-3xl text-white leading-tight">Home</Text>
      </GradientHeader>
      <FlatList
        data={items ?? []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#465A75"
          />
        }
        ListEmptyComponent={<HomeFeedEmpty />}
      />
    </View>
  );
}
