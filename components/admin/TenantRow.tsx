import { View, Text, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Profile } from '@/services/profiles';
import { Business } from '@/services/businesses';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { BRAND } from '@/constants/colors';

type TenantRowProps = {
  profile: Profile;
  business?: Business | null;
  onPress: () => void;
};

export function TenantRow({ profile, business, onPress }: TenantRowProps) {
  const displayName = profile.display_name ?? business?.business_name ?? profile.email;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100"
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      <Avatar
        imageUrl={business?.logo_url}
        name={displayName}
        size={44}
      />
      <View className="flex-1 ml-3 min-w-0">
        <Text className="text-base font-semibold text-brand-navy" numberOfLines={1}>
          {business?.business_name ?? profile.display_name ?? 'Unnamed Tenant'}
        </Text>
        <Text className="text-sm text-brand-steel" numberOfLines={1}>
          {profile.email}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        <StatusBadge status={profile.status} size="sm" />
        <ChevronRight size={16} color={BRAND.steel} />
      </View>
    </Pressable>
  );
}
