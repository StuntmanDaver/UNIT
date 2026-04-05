import { View, Text } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { BRAND } from '@/constants/colors';
import { Button } from './Button';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon: Icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
        <Icon size={32} color={BRAND.steel} />
      </View>
      <Text className="text-xl font-bold text-brand-navy text-center mb-2">{title}</Text>
      <Text className="text-base text-brand-steel text-center leading-6">{message}</Text>
      {actionLabel && onAction && (
        <View className="mt-6 w-full max-w-xs">
          <Button onPress={onAction}>{actionLabel}</Button>
        </View>
      )}
    </View>
  );
}
