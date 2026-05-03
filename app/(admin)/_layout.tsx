import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/lib/AuthContext';

export default function AdminLayout() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Redirect href="/(tabs)/directory" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="tenants" />
      <Stack.Screen name="advertisers" />
      <Stack.Screen name="properties" />
      <Stack.Screen name="push" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="promotions/index" />
      <Stack.Screen name="promotions/new-external" />
      <Stack.Screen name="promotions/[id]" />
    </Stack>
  );
}
