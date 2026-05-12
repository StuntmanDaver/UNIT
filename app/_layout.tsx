import '../global.css';
import { useEffect, useRef } from 'react';
import { LogBox } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { initSentry } from '@/lib/sentry';
import { queryClient } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { getAuthRedirectTarget } from '@/lib/authRedirectPolicy';

initSentry();

// Suppress Supabase SDK's internal console.error for expired/missing refresh tokens.
// The BUG-13 handler in AuthContext already catches this, signs the user out, and
// clears state. The error overlay is dev-only noise — production builds don't show it.
LogBox.ignoreLogs([
  'Invalid Refresh Token',
  'AuthApiError',
  '[expo-notifications] Error reading persisted server registration info',
]);

SplashScreen.preventAutoHideAsync();

// LoadingScreen is also used below while fonts are loading

function AuthGuard() {
  const { isAuthenticated, isLoading, needsPasswordChange, needsOnboarding, needsApproval, isInactive, isAdmin } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const splashHiddenRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    if (!splashHiddenRef.current) {
      splashHiddenRef.current = true;
      SplashScreen.hideAsync();
    }

    const redirectTarget = getAuthRedirectTarget({
      segments,
      isAuthenticated,
      needsPasswordChange,
      needsOnboarding,
      needsApproval,
      isInactive,
      isAdmin,
    });

    if (redirectTarget) {
      router.replace(redirectTarget as Parameters<typeof router.replace>[0]);
    }
  }, [isAuthenticated, isLoading, needsPasswordChange, needsOnboarding, needsApproval, isInactive, isAdmin, router, segments]);

  if (isLoading) {
    return <LoadingScreen message="Loading..." showLogo />;
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
    return <LoadingScreen message="Starting..." showLogo />;
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
