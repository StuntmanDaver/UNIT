import { View, Text } from 'react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';

export default function NotificationsScreen() {
  return (
    <View className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Notifications</Text>
      </GradientHeader>
      <View className="flex-1 items-center justify-center">
        <Text className="text-brand-steel text-lg">Coming in Milestone 3</Text>
      </View>
    </View>
  );
}
