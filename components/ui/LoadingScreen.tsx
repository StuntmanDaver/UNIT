import { View, ActivityIndicator, Text, Image } from 'react-native';

type LoadingScreenProps = {
  message?: string;
  showLogo?: boolean;
};

export function LoadingScreen({ message, showLogo = false }: LoadingScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-brand-cloud px-8">
      {showLogo && (
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel="UNIT logo"
          source={require('../../assets/unit-logo-light.png')}
          style={{ width: 180, height: 180, marginBottom: 24 }}
          resizeMode="contain"
        />
      )}
      <ActivityIndicator size={showLogo ? 'large' : 'small'} color="#5F708A" />
      {message && (
        <Text className="text-brand-ink-muted mt-4 text-base font-nunito text-center">
          {message}
        </Text>
      )}
    </View>
  );
}
