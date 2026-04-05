import { View, Text } from 'react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';

export default function DirectoryScreen() {
  return (
    <View className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Directory</Text>
        <Text className="text-brand-steel text-sm">Browse tenant businesses</Text>
      </GradientHeader>
      <View className="flex-1 items-center justify-center">
        <Text className="text-brand-steel text-lg">Coming in Milestone 2</Text>
      </View>
    </View>
  );
}
