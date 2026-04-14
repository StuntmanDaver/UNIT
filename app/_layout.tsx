import '../global.css';
import { useEffect, useRef } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';

SplashScreen.preventAutoHideAsync();
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { queryClient } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

function AuthGuard() {
  const { isAuthenticated, isLoading, needsPasswordChange, needsOnboarding, isAdmin } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const splashHiddenRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    if (!splashHiddenRef.current) {
      splashHiddenRef.current = true;
      SplashScreen.hideAsync();
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && needsPasswordChange && !segments.includes('reset-password')) {
      router.replace('/(auth)/reset-password');
    } else if (isAuthenticated && needsOnboarding && !inAuthGroup) {
      router.replace('/(auth)/onboarding');
    } else if (isAuthenticated && !needsPasswordChange && !needsOnboarding && inAuthGroup) {
      if (segments.includes('reset-password')) {
        router.replace('/(tabs)/profile/edit');
      } else if (isAdmin) {
        router.replace('/(admin)/');
      } else {
        router.replace('/(tabs)/directory');
      }
    }
  }, [isAuthenticated, isLoading, needsPasswordChange, needsOnboarding, isAdmin, segments]);

  if (isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  return <Slot />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Lora_400Regular: require('../assets/fonts/Lora_400Regular.ttf'),
    Lora_600SemiBold: require('../assets/fonts/Lora_600SemiBold.ttf'),
    Lora_700Bold: require('../assets/fonts/Lora_700Bold.ttf'),
    Nunito_400Regular: require('../assets/fonts/Nunito_400Regular.ttf'),
    Nunito_600SemiBold: require('../assets/fonts/Nunito_600SemiBold.ttf'),
    Nunito_700Bold: require('../assets/fonts/Nunito_700Bold.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="light" />
          <AuthGuard />
          <Toast />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
