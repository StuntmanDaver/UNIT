// variant='dark' keeps the historical API name while now resolving to the
// global Delta-style light card surface.
// variant='light' remains an explicit alias for screens that already use
// brand-mist / brand-paper / brand-ink tokens directly.
import { View, Pressable } from 'react-native';

export type CardVariant = 'dark' | 'light';

type CardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
  variant?: CardVariant;
  testID?: string;
};

export function Card({ children, onPress, className = '', variant = 'dark', testID }: CardProps) {
  const variantClass =
    variant === 'light'
      ? 'bg-brand-mist border border-brand-paper rounded-xl shadow-sm'
      : 'bg-brand-mist rounded-xl shadow-sm border border-brand-blue/40';

  const baseClass = `${variantClass} ${className}`;

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        className={baseClass}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        {children}
      </Pressable>
    );
  }

  return <View testID={testID} className={baseClass}>{children}</View>;
}
