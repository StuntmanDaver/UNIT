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
      <View className="w-16 h-16 rounded-full bg-brand-navy-light items-center justify-center mb-4">
        <Icon size={32} color={BRAND.steel} />
      </View>
      <Text className="text-2xl font-lora-semibold text-brand-gray leading-tight mb-2 text-center">{title}</Text>
      <Text className="text-base font-nunito text-brand-gray leading-relaxed text-center">{message}</Text>
      {actionLabel && onAction && (
        <View className="mt-6 w-full max-w-xs">
          <Button onPress={onAction}>{actionLabel}</Button>
        </View>
      )}
    </View>
  );
}
