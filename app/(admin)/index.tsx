import { View, Text } from 'react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';

export default function AdminDashboard() {
  return (
    <View className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Admin</Text>
      </GradientHeader>
      <View className="flex-1 items-center justify-center">
        <Text className="text-brand-steel text-lg">Admin dashboard coming in Milestone 2</Text>
      </View>
    </View>
  );
}
