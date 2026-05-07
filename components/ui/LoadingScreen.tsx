import { View, ActivityIndicator, Text, Image } from 'react-native';

type LoadingScreenProps = {
  message?: string;
};

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-brand-navy">
      <Image
        source={require('../../assets/unit-logo-dark.png')}
        style={{ width: 200, height: 200, marginBottom: 24 }}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#7C8DA7" />
      {message && <Text className="text-brand-steel mt-4 text-base font-nunito">{message}</Text>}
    </View>
  );
}
