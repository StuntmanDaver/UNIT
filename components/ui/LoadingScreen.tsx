import { View, ActivityIndicator, Text } from 'react-native';

type LoadingScreenProps = {
  message?: string;
};

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-brand-navy">
      <ActivityIndicator size="large" color="#7C8DA7" />
      {message && <Text className="text-brand-steel mt-4 text-base">{message}</Text>}
    </View>
  );
}
