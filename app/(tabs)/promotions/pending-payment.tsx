import { View, Text, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Clock } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { promotionsService } from '@/services/promotions';
import { BRAND } from '@/constants/colors';

export default function PendingPaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: promo, isLoading } = useQuery({
    queryKey: ['promotion', id],
    queryFn: () => promotionsService.getById(id ?? ''),
    enabled: !!id,
  });

  if (isLoading) {
    return <LoadingScreen message="Loading promotion..." />;
  }

  if (!promo) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-navy">
        <Text className="text-base font-nunito text-brand-gray leading-relaxed">Promotion not found.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-navy">
      <GradientHeader>
        <Text className="text-3xl font-lora-semibold text-white leading-tight">Promotion Created</Text>
      </GradientHeader>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 }}>
        {/* Status badge */}
        <View className="flex-row items-center gap-3 bg-brand-navy-light border border-brand-blue/40 rounded-2xl p-4 mb-6">
          <Clock size={24} color={BRAND.steel} />
          <View className="flex-1">
            <Text className="text-base font-nunito-semibold text-brand-gray leading-relaxed">Pending Payment</Text>
            <Text className="text-sm font-nunito text-brand-steel leading-normal mt-0.5">
              Complete payment to submit your promotion for admin review.
            </Text>
          </View>
        </View>

        {/* Promotion summary */}
        <Card className="p-5 mb-6">
          <Text className="text-sm font-nunito-semibold text-brand-steel leading-normal uppercase tracking-wide mb-3">
            Your Promotion
          </Text>
          <Text className="text-2xl font-lora-semibold text-brand-gray leading-tight mb-2">
            {promo.headline}
          </Text>
          {promo.description && (
            <Text className="text-base font-nunito text-brand-gray leading-relaxed mb-3">
              {promo.description}
            </Text>
          )}
          {(promo.start_date || promo.end_date) && (
            <Text className="text-sm font-nunito text-brand-steel leading-normal">
              {promo.start_date && `From ${promo.start_date}`}
              {promo.start_date && promo.end_date && ' · '}
              {promo.end_date && `Until ${promo.end_date}`}
            </Text>
          )}
        </Card>

        {/* Actions */}
        <View className="gap-3">
          {/* Pay Now — checkout wired up in US-014 */}
          <Button onPress={() => {}} disabled>
            Pay Now
          </Button>
          <Button onPress={() => router.replace('/(tabs)/promotions')} variant="ghost">
            Save for Later
          </Button>
        </View>

        <Text className="text-sm font-nunito text-brand-steel leading-normal text-center mt-6">
          Your promotion is saved as a draft. You can return to complete payment anytime from the Promotions tab.
        </Text>
      </ScrollView>
    </View>
  );
}
