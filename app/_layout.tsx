import '../global.css';
import { useEffect, useRef } from 'react';
import { LogBox } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';

// Suppress Supabase SDK's internal console.error for expired/missing refresh tokens.
// The BUG-13 handler in AuthContext already catches this, signs the user out, and
// clears state. The error overlay is dev-only noise — production builds don't show it.
LogBox.ignoreLogs(['Invalid Refresh Token', 'AuthApiError']);

SplashScreen.preventAutoHideAsync();
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { queryClient } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

// LoadingScreen is also used below while fonts are loading

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
    const onResetPassword = segments.includes('reset-password');
    const onOnboarding = segments.includes('onboarding');

    // Unauthenticated: anyone outside the auth group goes to login.
    if (!isAuthenticated) {
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }

    // Authenticated from here down.

    // Password change branch — highest priority. No longer gated on inAuthGroup
    // so a mid-session flag flip from inside (tabs) still forces the redirect.
    if (needsPasswordChange && !onResetPassword) {
      router.replace('/(auth)/reset-password');
      return;
    }

    // Onboarding branch (BUG-03 fix) — the previous guard required !inAuthGroup,
    // which stranded fresh signups on /signup with needsOnboarding=true. The
    // check now fires as long as we're not already ON the onboarding screen.
    if (!needsPasswordChange && needsOnboarding && !onOnboarding) {
      router.replace('/(auth)/onboarding');
      return;
    }

    // Stranded-in-auth-group branch: authed user with nothing to do is sitting
    // on login/signup/reset-password/onboarding — push them to the right home.
    if (!needsPasswordChange && !needsOnboarding && inAuthGroup) {
      // BUG-04 decision: post-reset landing stays at /(tabs)/profile/edit.
      // Invited tenants have a business profile stub-created by the invite-tenant
      // Edge Function with no logo / unit_number / contact fields — sending them
      // to profile/edit lets them complete those fields immediately. Fresh
      // signups that went through onboarding hit the onboarding branch above
      // and land on /(tabs)/directory (or /(admin)/ for landlords) via the
      // else branches below.
      if (onResetPassword) {
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
    return <LoadingScreen message="Starting..." />;
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
