import * as Sentry from '@sentry/react-native'
import { isRunningInExpoGo } from 'expo'

// Required env: EXPO_PUBLIC_SENTRY_DSN (see unit/.env.example). When unset,
// Sentry.init runs with dsn: undefined and the SDK silently no-ops — the app
// works but no crash reports are captured. Source-map upload also requires
// SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN at build time AND removing
// SENTRY_DISABLE_AUTO_UPLOAD=true from the relevant eas.json profile.
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
