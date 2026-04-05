import { View, type ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type GradientHeaderProps = ViewProps & {
  children: React.ReactNode;
};

export function GradientHeader({ children, className = '', ...props }: GradientHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={['#101B29', '#465A75']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ paddingTop: insets.top }}
    >
      <View className={`px-4 pb-4 pt-2 ${className}`} {...props}>
        {children}
      </View>
    </LinearGradient>
  );
}
