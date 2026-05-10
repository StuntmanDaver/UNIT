import { Pressable, Text, ActivityIndicator } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

type ButtonProps = {
  onPress: () => void;
  children: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  testID?: string;
};

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: 'bg-brand-blue',
    text: 'text-white',
  },
  secondary: {
    container: 'bg-brand-mist border border-brand-blue/40',
    text: 'text-brand-ink',
  },
  destructive: {
    container: 'bg-red-700',
    text: 'text-white',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-brand-ink',
  },
};

export function Button({
  onPress,
  children,
  variant = 'primary',
  disabled = false,
  loading = false,
  className = '',
  testID,
}: ButtonProps) {
  const styles = variantStyles[variant];
  const isDisabledOnly = disabled && !loading;
  const containerStyle = isDisabledOnly ? 'bg-brand-paper border border-brand-blue/30' : styles.container;
  const textStyle = isDisabledOnly ? 'text-brand-ink-muted' : styles.text;
  const loadingColor = variant === 'primary' || variant === 'destructive' ? '#FFFFFF' : '#101B29';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      testID={testID}
      className={`rounded-xl px-4 py-3 min-h-[44px] items-center justify-center ${containerStyle} ${className}`}
      style={({ pressed }) => ({ opacity: pressed && !disabled ? 0.7 : 1 })}
    >
      {loading ? (
        <ActivityIndicator color={loadingColor} />
      ) : (
        <Text className={`text-base font-nunito-semibold ${textStyle}`}>{children}</Text>
      )}
    </Pressable>
  );
}
