import { View, Text } from 'react-native';

type BadgeProps = {
  label: string;
  color: { bg: string; text: string };
  size?: 'sm' | 'md';
};

export function Badge({ label, color, size = 'md' }: BadgeProps) {
  // Spacing stays on the 4/8 grid; both sizes use the single permitted Badge text
  // class (font-nunito text-sm) per UI-SPEC §Primitive Contract.
  const paddingClass = size === 'sm' ? 'px-2 py-1' : 'px-4 py-1';

  return (
    <View
      className={`rounded-full ${paddingClass} self-start`}
      style={{ backgroundColor: color.bg }}
    >
      <Text className="text-sm font-nunito" style={{ color: color.text }}>
        {label}
      </Text>
    </View>
  );
}
