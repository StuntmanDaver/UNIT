import { View, Text } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { BRAND } from '@/constants/colors';
import { Card } from '@/components/ui/Card';

type StatCardProps = {
  label: string;
  value: number;
  icon?: LucideIcon;
  onPress?: () => void;
};

export function StatCard({ label, value, icon: Icon, onPress }: StatCardProps) {
  return (
    <Card onPress={onPress} className="p-4 flex-1">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-3xl font-bold text-brand-navy">{value}</Text>
          <Text className="text-sm text-brand-steel mt-1">{label}</Text>
        </View>
        {Icon && (
          <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
            <Icon size={20} color={BRAND.blue} />
          </View>
        )}
      </View>
    </Card>
  );
}
