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
    </Stack>
  );
}
