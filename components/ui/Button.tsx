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
    container: 'bg-brand-navy-light border border-brand-steel',
    text: 'text-white',
  },
  destructive: {
    container: 'bg-red-600',
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
      className={`rounded-xl px-6 py-3.5 items-center justify-center ${styles.container} ${
        disabled ? 'opacity-50' : ''
      } ${className}`}
      style={({ pressed }) => ({ opacity: pressed && !disabled ? 0.8 : 1 })}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? '#FFFFFF' : '#FFFFFF'} />
      ) : (
        <Text className={`text-base font-semibold font-arcadia ${styles.text}`}>{children}</Text>
      )}
    </Pressable>
  );
}
