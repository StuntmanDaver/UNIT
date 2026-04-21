import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { pushService } from '@/services/push';

// Configure notification display behaviour at module level
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  // Push tokens are not available on web
  if (Platform.OS === 'web') {
    return null;
  }

  // Check existing permission status
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;

  if (!projectId) {
    console.warn('No EAS project ID found — skipping push token registration. Push notifications require an EAS build.');
    return null;
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(projectId)) {
    if (__DEV__) {
      console.warn(`EAS projectId in app.json is not a valid UUID (got "${projectId}"). Run \`eas init\` in unit/ to create an Expo project, then rebuild the dev client. Remote push requires a real EAS project ID.`);
    }
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (error) {
    console.warn('Error getting push token:', error);
    return null;
  }
}

export function handleNotificationResponse(response: Notifications.NotificationResponse): void {
  const data = response.notification.request.content.data as { type?: string } | null;
  const type = data?.type;

  switch (type) {
    case 'post':
      router.push('/(tabs)/community');
      break;
    case 'offer':
    case 'promotion':
    case 'advertiser_approved':
      router.push('/(tabs)/promotions');
      break;
    case 'broadcast':
      router.push('/(tabs)/notifications');
      break;
    default:
      router.push('/(tabs)/notifications');
      break;
  }
}

interface UsePushNotificationsResult {
  expoPushToken: string | null;
  permissionGranted: boolean;
  enablePush: () => Promise<void>;
  disablePush: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Register on mount
    registerForPushNotifications().then(async (token) => {
      if (token) {
        setExpoPushToken(token);
        setPermissionGranted(true);
        try {
          await pushService.registerToken(token);
        } catch {
          // Non-fatal: token is still held in state
        }
      }
    });

    // Listen for notification interaction responses
    responseListenerRef.current =
      Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    return () => {
      if (responseListenerRef.current) {
        responseListenerRef.current.remove();
        responseListenerRef.current = null;
      }
    };
  }, []);

  async function enablePush(): Promise<void> {
    const token = await registerForPushNotifications();
    if (token) {
      setExpoPushToken(token);
      setPermissionGranted(true);
      await pushService.registerToken(token);
    }
  }

  async function disablePush(): Promise<void> {
    await pushService.unregisterToken();
    setExpoPushToken(null);
    setPermissionGranted(false);
  }

  return { expoPushToken, permissionGranted, enablePush, disablePush };
}
