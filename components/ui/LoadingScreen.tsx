import { View, ActivityIndicator, Text, Image } from 'react-native';

type LoadingScreenProps = {
  message?: string;
};

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-brand-cloud">
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="UNIT logo"
        source={require('../../assets/unit-logo-light.png')}
        style={{ width: 180, height: 180, marginBottom: 24 }}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#5F708A" />
      {message && <Text className="text-brand-ink-muted mt-4 text-base font-nunito">{message}</Text>}
    </View>
  );
}
