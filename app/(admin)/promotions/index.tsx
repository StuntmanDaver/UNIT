import { useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { Megaphone, ChevronLeft, Plus } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BRAND } from '@/constants/colors';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PropertySelector } from '@/components/admin/PropertySelector';
import { useAuth } from '@/lib/AuthContext';
import { useAdminAllPromotionList } from '@/hooks/useAdminPromotions';
import { type Promotion, getPromotionKind } from '@/services/promotions';
import { firstParam } from '@/lib/routeParams';

const SEGMENTS = ['All', 'Pending', 'Approved', 'External'];

function filterPromotions(promotions: Promotion[], segment: string): Promotion[] {
  switch (segment) {
    case 'Pending':
      return promotions.filter((p) => p.review_status === 'pending');
    case 'Approved':
      return promotions.filter(
        (p) => p.review_status === 'approved' || p.review_status === 'suspended'
      );
    case 'External':
      return promotions.filter((p) => getPromotionKind(p) === 'external');
    default:
      return promotions;
  }
}

export default function AdminPromotionsScreen() {
  const { propertyIds } = useAuth();
  const params = useLocalSearchParams<{ propertyId?: string; filter?: string }>();
  const initialPropertyId = firstParam(params.propertyId);

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(() =>
    initialPropertyId && initialPropertyId.length > 0 ? initialPropertyId : null
  );
  const [segment, setSegment] = useState<string>(() =>
    params.filter && SEGMENTS.includes(params.filter as string)
      ? (params.filter as string)
      : 'All'
  );

  const activePropertyId = selectedPropertyId ?? '';

  const { data: allPromotions, isLoading, isError, error, refetch } = useAdminAllPromotionList(activePropertyId);

  const visiblePromotions = useMemo(
    () => filterPromotions(allPromotions ?? [], segment),
    [allPromotions, segment]
  );

  const renderItem = ({ item }: { item: Promotion }) => {
    const isExternal = getPromotionKind(item) === 'external';
    const statusLabel = item.review_status
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return (
      <Pressable
        testID="promo-card"
        accessibilityLabel={`Promotion ${item.headline}`}
        onPress={() => router.push(`/(admin)/promotions/${item.id}` as Parameters<typeof router.push>[0])}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <Card className="mx-4 mb-3 p-4">
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-1 mr-3">
              <Text className="text-base font-nunito-semibold text-white" numberOfLines={1}>
                {item.headline}
              </Text>
              <Text className="text-sm font-nunito text-brand-gray mt-0.5" numberOfLines={1}>
                {item.business_name}
              </Text>
            </View>
            <View className="flex-row gap-2 items-center flex-wrap justify-end">
              {isExternal && (
                <Badge
                  label="External"
                  color={{ bg: BRAND.blue, text: '#FFFFFF' }}
                  size="sm"
                />
              )}
              <View className="bg-brand-blue/40 rounded-full px-2 py-1">
                <Text className="text-sm font-nunito-semibold text-white">{statusLabel}</Text>
              </View>
            </View>
          </View>

          {item.description ? (
            <Text
              className="text-sm font-nunito text-brand-gray leading-relaxed"
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}

          {item.start_date && item.end_date ? (
            <Text className="text-sm font-nunito text-brand-steel mt-2">
              {item.start_date} → {item.end_date}
            </Text>
          ) : null}
        </Card>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-brand-navy">
      <GradientHeader>
        <View className="flex-row items-center justify-between mb-2">
          <Pressable
            testID="back-btn"
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            className="p-3"
          >
            <ChevronLeft size={24} color={BRAND.gray} />
          </Pressable>
          <Pressable
            testID="new-external-promotion-btn"
            onPress={() =>
              router.push({
                pathname: '/(admin)/promotions/new-external',
                params: { propertyId: activePropertyId },
              } as Parameters<typeof router.push>[0])
            }
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            className="p-3"
            accessibilityLabel="New External Promotion"
          >
            <Plus size={22} color={BRAND.gray} />
          </Pressable>
        </View>

        <Text className="text-2xl font-lora-semibold text-white leading-tight">Promotions</Text>

        <View className="mt-3">
          <PropertySelector
            propertyIds={propertyIds}
            selected={selectedPropertyId}
            onSelect={setSelectedPropertyId}
          />
        </View>
      </GradientHeader>

      {!activePropertyId ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-base font-nunito text-brand-steel text-center">
            Select a property to manage promotions
          </Text>
        </View>
      ) : (
        <>
          <View className="px-4 pt-4 pb-2">
            <SegmentedControl segments={SEGMENTS} selected={segment} onChange={setSegment} />
          </View>

          {isLoading ? (
            <LoadingScreen message="Loading promotions..." />
          ) : isError ? (
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-base font-nunito text-red-400 text-center mb-3">
                {error?.message ?? 'Failed to load promotions'}
              </Text>
              <Button onPress={() => refetch()} variant="secondary">Retry</Button>
            </View>
          ) : (
            <FlatList
              data={visiblePromotions}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={{ flexGrow: 1, paddingTop: 12, paddingBottom: 32 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <EmptyState
                  icon={Megaphone}
                  title="No promotions"
                  message={`No ${segment.toLowerCase()} promotions for this property`}
                />
              }
            />
          )}
        </>
      )}
    </View>
  );
}
