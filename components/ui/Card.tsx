// variant='dark' (default): bg-brand-navy-light — use on dark (brand-navy) screens.
// variant='light': bg-brand-mist border-brand-paper — use only on Home Feed and explicitly migrated light-surface screens.
// Text inside a light card must use text-brand-ink / text-brand-ink-muted for AA contrast.
import { View, Pressable } from 'react-native';

export type CardVariant = 'dark' | 'light';

type CardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
  variant?: CardVariant;
};

export function Card({ children, onPress, className = '', variant = 'dark' }: CardProps) {
  const variantClass =
    variant === 'light'
      ? 'bg-brand-mist border border-brand-paper rounded-xl shadow-sm'
      : 'bg-brand-navy-light rounded-xl shadow-sm border border-brand-blue/40';

  const baseClass = `${variantClass} ${className}`;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={baseClass}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        {children}
      </Pressable>
    );
  }

  return <View className={baseClass}>{children}</View>;
}
