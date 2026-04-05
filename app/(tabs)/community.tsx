import { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Users } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { FAB } from '@/components/ui/FAB';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { PostCard } from '@/components/tenant/PostCard';
import { usePosts } from '@/hooks/usePosts';
import { useBusinesses } from '@/hooks/useBusinesses';
import { useAuth } from '@/lib/AuthContext';
import type { Post } from '@/services/posts';

const SEGMENTS = ['All', 'Announcements', 'Events'] as const;
type Segment = (typeof SEGMENTS)[number];

const SEGMENT_TYPE_MAP: Record<Segment, string | undefined> = {
  All: undefined,
  Announcements: 'announcement',
  Events: 'event',
};

export default function CommunityScreen() {
  const { propertyIds } = useAuth();
  const propertyId = propertyIds[0] ?? '';

  const [segment, setSegment] = useState<Segment>('All');

  const typeFilter = SEGMENT_TYPE_MAP[segment];
  const excludeType = segment === 'All' ? 'offer' : undefined;

  const { data: posts, isLoading, refetch, isRefetching } = usePosts(
    propertyId,
    typeFilter,
    excludeType
  );

  const { data: businesses } = useBusinesses(propertyId);

  const businessMap = businesses
    ? Object.fromEntries(businesses.map((b) => [b.id, b]))
    : {};

  const renderItem = useCallback(
    ({ item }: { item: Post }) => (
      <View className="px-4 mb-3">
        <PostCard post={item} authorBusiness={businessMap[item.business_id] ?? null} />
      </View>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [businesses]
  );

  const keyExtractor = useCallback((item: Post) => item.id, []);

  if (isLoading && !posts) {
    return <LoadingScreen message="Loading community..." />;
  }

  return (
    <View className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white mb-3">Community</Text>
        <SegmentedControl
          segments={SEGMENTS as unknown as string[]}
          selected={segment}
          onChange={(s) => setSegment(s as Segment)}
        />
      </GradientHeader>

      <FlatList
        data={posts ?? []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={Users}
            title="No posts yet"
            message="Announcements and events from tenants will appear here."
          />
        }
      />

      <FAB onPress={() => router.push('/community/create')} />
    </View>
  );
}
