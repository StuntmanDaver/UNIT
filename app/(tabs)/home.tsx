import { View, Text } from 'react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';

// US-005 placeholder. Real activity feed lands in US-007 (FlatList of
// ActivityFeedCards on bg-brand-cloud). Until then this screen exists so the
// 6-tab layout has a concrete target route and the post-login redirect can
// land here without crashing.
export default function HomeScreen() {
  return (
    <View className="flex-1 bg-brand-navy">
      <GradientHeader>
        <Text className="font-lora-semibold text-3xl text-white leading-tight">
          Home
        </Text>
      </GradientHeader>
      <View className="flex-1 items-center justify-center px-8">
        <Text className="font-lora-semibold text-3xl text-brand-gray leading-tight">
          Welcome
        </Text>
        <Text className="mt-4 font-nunito text-base text-brand-steel leading-relaxed text-center">
          Your activity feed is coming soon.
        </Text>
      </View>
    </View>
  );
}
