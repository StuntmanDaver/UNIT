import { View, Pressable } from 'react-native';

type CardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
};

export function Card({ children, onPress, className = '' }: CardProps) {
  const baseClass = `bg-white rounded-xl shadow-sm border border-gray-100 ${className}`;

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
