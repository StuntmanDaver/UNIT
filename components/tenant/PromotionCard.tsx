import { View, Text, Pressable, Linking, Image } from 'react-native';
import { Post } from '@/services/posts';
import { type Promotion } from '@/services/promotions';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

type TenantVariant = {
  variant: 'tenant';
  data: Post;
  onPress?: () => void;
};

type AdvertiserVariant = {
  variant: 'advertiser';
  data: Promotion;
  onPress?: () => void;
};

type PromotionCardProps = TenantVariant | AdvertiserVariant;

const OFFER_COLOR = { bg: '#FEF3C7', text: '#92400E' };
const LOCAL_BIZ_COLOR = { bg: '#DBEAFE', text: '#1D4ED8' };

export function PromotionCard(props: PromotionCardProps) {
  if (props.variant === 'tenant') {
    const { data: post, onPress } = props;

    return (
      <Card onPress={onPress} className="p-4">
        <View className="flex-row items-start justify-between mb-2">
          <Badge label="Offer" color={OFFER_COLOR} size="sm" />
          {post.expiry_date && (
            <Text className="text-sm font-nunito text-brand-gray">Expires {post.expiry_date}</Text>
          )}
        </View>
        <Text className="text-base font-nunito-semibold text-brand-gray mb-1 leading-relaxed">{post.title}</Text>
        <Text className="text-base font-nunito text-brand-gray leading-relaxed" numberOfLines={3}>
          {post.content}
        </Text>
      </Card>
    );
  }

  // Advertiser variant
  const { data: promo, onPress } = props;

  const handleCTA = () => {
    if (promo.cta_link) {
      Linking.openURL(promo.cta_link).catch(() => {});
    }
  };

  return (
    <Card onPress={onPress} className="overflow-hidden">
      {promo.image_url && (
        <Image
          source={{ uri: promo.image_url }}
          className="w-full h-40"
          resizeMode="cover"
        />
      )}
      <View className="p-4">
        <View className="flex-row items-start justify-between mb-2">
          <Badge label="Local Business" color={LOCAL_BIZ_COLOR} size="sm" />
        </View>
        <Text className="text-base font-nunito-semibold text-brand-gray mb-1 leading-relaxed">{promo.headline}</Text>
        {promo.description && (
          <Text className="text-base font-nunito text-brand-gray leading-relaxed mb-3" numberOfLines={3}>
            {promo.description}
          </Text>
        )}
        {promo.cta_text && promo.cta_link && (
          <Button onPress={handleCTA} variant="primary">
            {promo.cta_text}
          </Button>
        )}
      </View>
    </Card>
  );
}
