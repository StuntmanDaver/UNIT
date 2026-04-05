import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/lib/AuthContext';

export default function AdminLayout() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Redirect href="/(tabs)/directory" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
