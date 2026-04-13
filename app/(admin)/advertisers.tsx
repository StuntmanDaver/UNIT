import { useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { Megaphone, ChevronLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { BRAND } from '@/constants/colors';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Card } from '@/components/ui/Card';
import { PropertySelector } from '@/components/admin/PropertySelector';
import { useAuth } from '@/lib/AuthContext';
import { useAdminPromotionList } from '@/hooks/useAdminPromotions';
import { type Promotion } from '@/services/promotions';

const STATUS_SEGMENTS = ['Pending', 'Approved', 'Rejected'];

const statusMap: Record<string, Promotion['review_status'][]> = {
  Pending: ['pending'],
  Approved: ['approved', 'suspended'],
  Rejected: ['rejected', 'expired'],
};

export default function AdvertisersScreen() {
  const { propertyIds } = useAuth();

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('Pending');

  const activePropertyId = selectedPropertyId ?? '';

  const { data: promotions, isLoading } = useAdminPromotionList(
    activePropertyId,
    statusMap[statusFilter] ?? ['pending']
  );

  const renderPromotion = ({ item }: { item: Promotion }) => (
    <Pressable onPress={() => router.push(`/promotions/${item.id}`)}>
      <Card className="mx-4 mb-3 p-4">
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-3">
            <Text className="text-base font-nunito-semibold text-white">{item.headline}</Text>
            <Text className="text-sm font-nunito text-brand-gray mt-0.5">{item.business_name}</Text>
          </View>
          <View className="bg-brand-blue/40 rounded-full px-2 py-1">
            <Text className="text-sm font-nunito-semibold text-white">
              {item.review_status.charAt(0).toUpperCase() + item.review_status.slice(1)}
            </Text>
          </View>
        </View>

        {item.description ? (
          <Text className="text-sm font-nunito text-brand-gray leading-relaxed mb-3" numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-brand-navy">
      <GradientHeader>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          className="mb-2 self-start"
        >
          <ChevronLeft size={24} color={BRAND.gray} />
        </Pressable>
        <Text className="text-2xl font-lora-semibold text-white leading-tight">Advertisers</Text>
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
          <View className="px-4 pt-4 gap-3">
            <SegmentedControl
              segments={STATUS_SEGMENTS}
              selected={statusFilter}
              onChange={setStatusFilter}
            />
          </View>

          {isLoading ? (
            <LoadingScreen message="Loading promotions..." />
          ) : (
            <FlatList
              data={promotions ?? []}
              keyExtractor={(item) => item.id}
              renderItem={renderPromotion}
              contentContainerStyle={{ flexGrow: 1, paddingTop: 12, paddingBottom: 32 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <EmptyState
                  icon={Megaphone}
                  title="No promotions"
                  message={`No ${statusFilter.toLowerCase()} promotions for this property`}
                />
              }
            />
          )}
        </>
      )}
    </View>
  );
}
