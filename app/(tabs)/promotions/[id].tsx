import { View, Text, ScrollView, Image, Pressable, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { promotionsService } from '@/services/promotions';

export default function PromotionDetailScreen() {
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
        <Text className="text-base font-nunito text-brand-gray leading-relaxed">
          Promotion not found.
        </Text>
      </View>
    );
  }

  const handleCTA = () => {
    if (promo.cta_link) {
      Linking.openURL(promo.cta_link).catch(() => {});
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-brand-navy"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <GradientHeader>
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center gap-1.5 mb-3"
          hitSlop={8}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
          <Text className="text-base font-nunito text-white leading-relaxed">Back</Text>
        </Pressable>
        <Text className="font-lora-semibold text-3xl text-white leading-tight">
          {promo.business_name}
        </Text>
      </GradientHeader>

      <View className="px-4 pt-6">
        {promo.image_url && (
          <View className="rounded-xl overflow-hidden mb-6">
            <Image
              source={{ uri: promo.image_url }}
              style={{ aspectRatio: 16 / 9, width: '100%' }}
              resizeMode="cover"
            />
          </View>
        )}

        <Card className="p-6 mb-4">
          <Text className="text-2xl font-lora-semibold text-brand-gray leading-tight mb-2">
            {promo.headline}
          </Text>
          {promo.description && (
            <Text className="text-base font-nunito text-brand-gray leading-relaxed">
              {promo.description}
            </Text>
          )}
          {(promo.start_date || promo.end_date) && (
            <Text className="text-sm font-nunito text-brand-gray leading-normal mt-3">
              {promo.start_date && `From ${promo.start_date}`}
              {promo.start_date && promo.end_date && ' · '}
              {promo.end_date && `Until ${promo.end_date}`}
            </Text>
          )}
        </Card>

        {promo.cta_text && promo.cta_link && (
          <Button onPress={handleCTA} variant="primary">
            {promo.cta_text}
          </Button>
        )}
      </View>
    </ScrollView>
  );
}
