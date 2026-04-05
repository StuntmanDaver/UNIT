import { View, Text } from 'react-native';

type BadgeProps = {
  label: string;
  color: { bg: string; text: string };
  size?: 'sm' | 'md';
};

export function Badge({ label, color, size = 'md' }: BadgeProps) {
  const paddingClass = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';
  const textClass = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <View
      className={`rounded-full ${paddingClass} self-start`}
      style={{ backgroundColor: color.bg }}
    >
      <Text className={`${textClass} font-medium`} style={{ color: color.text }}>
        {label}
      </Text>
    </View>
  );
}
