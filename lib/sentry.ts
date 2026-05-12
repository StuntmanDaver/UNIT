import * as Sentry from '@sentry/react-native'
import { isRunningInExpoGo } from 'expo'
import Constants from 'expo-constants'
import { appEnvironment } from '@/constants/runtime'

// Required env: EXPO_PUBLIC_SENTRY_DSN (see unit/.env.example). When unset,
// Sentry.init runs with dsn: undefined and the SDK silently no-ops — the app
// works but no crash reports are captured. Source-map upload requires
// SENTRY_ORG, SENTRY_PROJECT, and SENTRY_AUTH_TOKEN at EAS build time.
export function initSentry(): void {
  const slug = Constants.expoConfig?.slug ?? 'unit-app'
  const version = Constants.expoConfig?.version ?? '0.0.0'
  const dist = Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode?.toString()

  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: appEnvironment,
    release: `${slug}@${version}`,
    dist,
    tracesSampleRate: appEnvironment === 'production' ? 0.1 : 1.0,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30_000,
    // Disable in Expo Go — native crash reporting doesn't work there
    enabled: !isRunningInExpoGo(),
    integrations: [
      Sentry.mobileReplayIntegration({
        maskAllImages: false,
        maskAllText: false,
      }),
    ],
  })
}
