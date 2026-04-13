import { Pressable, Text, ActivityIndicator } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

type ButtonProps = {
  onPress: () => void;
  children: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
};

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: 'bg-brand-blue',
    text: 'text-white',
  },
  secondary: {
    container: 'bg-brand-navy-light border border-brand-blue/40',
    text: 'text-brand-gray',
  },
  destructive: {
    container: 'bg-red-500',
    text: 'text-white',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-brand-gray',
  },
};

export function Button({
  onPress,
  children,
  variant = 'primary',
  disabled = false,
  loading = false,
  className = '',
}: ButtonProps) {
  const styles = variantStyles[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`rounded-xl px-4 py-3 min-h-[44px] items-center justify-center ${styles.container} ${
        disabled ? 'opacity-50' : ''
      } ${className}`}
      style={({ pressed }) => ({ opacity: pressed && !disabled ? 0.7 : 1 })}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text className={`text-base font-nunito-semibold ${styles.text}`}>{children}</Text>
      )}
    </Pressable>
  );
}
