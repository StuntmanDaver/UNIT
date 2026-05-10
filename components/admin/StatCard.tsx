import { View, Text } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { BRAND } from '@/constants/colors';
import { Card } from '@/components/ui/Card';

type StatCardProps = {
  label: string;
  value: number;
  icon?: LucideIcon;
  onPress?: () => void;
  testID?: string;
};

export function StatCard({ label, value, icon: Icon, onPress, testID }: StatCardProps) {
  return (
    <Card onPress={onPress} testID={testID} className="p-4 flex-1">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-2xl font-lora-semibold text-brand-ink">{value}</Text>
          <Text className="text-sm font-nunito text-brand-ink mt-1">{label}</Text>
        </View>
        {Icon && (
          <View className="w-10 h-10 rounded-full bg-brand-blue items-center justify-center">
            <Icon size={20} color="#FFFFFF" />
          </View>
        )}
      </View>
    </Card>
  );
}
