import * as Sentry from '@sentry/react-native'
import { isRunningInExpoGo } from 'expo'

export function initSentry() {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
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
