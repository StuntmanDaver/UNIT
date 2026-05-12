import type { EventSubscription, NotificationResponse } from 'expo-notifications';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { pushService } from '@/services/push';

type ExpoNotifications = typeof import('expo-notifications');

let notificationsModulePromise: Promise<ExpoNotifications> | null = null;

async function loadNotificationsModule(): Promise<ExpoNotifications | null> {
  if (Platform.OS === 'web' || !Constants.isDevice) {
    return null;
  }

  notificationsModulePromise ??= import('expo-notifications').then((module) => {
    module.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: true,
      }),
    });

    return module;
  });

  return notificationsModulePromise;
}

async function registerForPushNotifications(): Promise<string | null> {
  // Push tokens are not available on web
  if (Platform.OS === 'web') {
    return null;
  }

  if (!Constants.isDevice) {
    if (__DEV__) {
      console.warn('Push token registration is skipped on simulators. Use a physical device to test remote push notifications.');
    }
    return null;
  }

  const Notifications = await loadNotificationsModule();
  if (!Notifications) return null;

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
      console.warn(`EAS projectId in app.config.ts is not a valid UUID (got "${projectId}"). Run \`eas init\` in unit/ to create an Expo project, then rebuild the dev client. Remote push requires a real EAS project ID.`);
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

export function handleNotificationResponse(response: NotificationResponse): void {
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
  const responseListenerRef = useRef<EventSubscription | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Register on mount
    registerForPushNotifications().then(async (token) => {
      if (token && isMounted) {
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
    loadNotificationsModule().then((Notifications) => {
      if (!Notifications || !isMounted) return;
      responseListenerRef.current =
        Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    });

    return () => {
      isMounted = false;
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
