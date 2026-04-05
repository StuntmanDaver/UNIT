import { View, Text } from 'react-native';
import { Business } from '@/services/businesses';
import { getCategoryLabel } from '@/constants/categories';
import { CATEGORY_COLORS } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';

type BusinessCardProps = {
  business: Business;
  onPress?: () => void;
  compact?: boolean;
};

export function BusinessCard({ business, onPress, compact = false }: BusinessCardProps) {
  const categoryColor = CATEGORY_COLORS[business.category] ?? '#6B7280';
  const badgeColor = { bg: categoryColor + '20', text: categoryColor };

  return (
    <Card onPress={onPress} className="p-4">
      <View className="flex-row items-start gap-3">
        <Avatar
          imageUrl={business.logo_url}
          name={business.business_name}
          size={compact ? 36 : 48}
        />
        <View className="flex-1 min-w-0">
          <View className="flex-row items-start justify-between gap-2">
            <Text className="text-base font-semibold text-brand-navy flex-1" numberOfLines={1}>
              {business.business_name}
            </Text>
            {business.unit_number && (
              <Text className="text-xs text-brand-steel">Unit {business.unit_number}</Text>
            )}
          </View>

          <View className="mt-1 mb-2">
            <Badge
              label={getCategoryLabel(business.category)}
              color={badgeColor}
              size="sm"
            />
          </View>

          {!compact && business.business_description && (
            <Text className="text-sm text-brand-steel leading-5" numberOfLines={2}>
              {business.business_description}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
}
