# Milestone 3: Completion & Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add push notifications end-to-end, build Notifications tab and Admin Push screen, polish UI, set up testing and CI/CD, prepare for app store submission, and write handoff documentation.

**Architecture:** Push notifications flow through Expo Push API via a new Edge Function. The `usePushNotifications` hook manages token lifecycle and deep linking. Notifications tab renders from existing `notificationsService`. Admin push screen composes and sends broadcasts. Testing uses Jest + React Native Testing Library. CI via GitHub Actions. Deployment via EAS Build + Submit.

**Tech Stack:** expo-notifications, Expo Push API, Supabase Edge Functions (Deno), Jest, Maestro, GitHub Actions, EAS Build/Submit

**Design Spec:** `docs/superpowers/specs/2026-04-05-milestone3-completion-release-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Install | `expo-notifications` | Push notification SDK |
| Modify | `app.json` | Add expo-notifications plugin |
| Create | `hooks/usePushNotifications.ts` | Token lifecycle, listeners, deep linking |
| Create | `supabase/functions/send-push-notification/index.ts` | Send pushes via Expo API + insert notifications |
| Modify | `services/admin.ts` | Replace sendPush stub with Edge Function call |
| Modify | `app/(tabs)/_layout.tsx` | Add usePushNotifications + tab badge |
| Modify | `app/(tabs)/notifications.tsx` | Full notification inbox screen |
| Create | `hooks/useNotifications.ts` | Notifications query hook |
| Create | `hooks/useUnreadCount.ts` | Unread badge count hook (30s poll) |
| Modify | `app/(tabs)/promotions/create.tsx` | Add push trigger after create |
| Modify | `app/(tabs)/community/create.tsx` | Add push trigger after create |
| Modify | `app/(admin)/advertisers.tsx` | Add push trigger after approve |
| Modify | `app/(tabs)/profile.tsx` | Add push toggle to settings |
| Create | `app/(admin)/push.tsx` | Admin push compose screen |
| Modify | `app/(admin)/_layout.tsx` | Register push screen |
| Modify | `app/(admin)/index.tsx` | Add "Send Push" nav link |
| Create | `jest.config.js` | Jest configuration |
| Create | `__tests__/services/businesses.test.ts` | Service unit tests |
| Create | `__tests__/hooks/usePromotions.test.ts` | Hook unit tests |
| Create | `__tests__/components/BusinessCard.test.tsx` | Component tests |
| Create | `maestro/flow-*.yaml` | E2E test flows (6 files) |
| Create | `.github/workflows/ci.yml` | CI pipeline |
| Create | `docs/deployment-runbook.md` | Deployment guide |
| Create | `docs/edge-functions.md` | Edge Function docs |
| Create | `docs/monetization-architecture.md` | Monetization notes |

---

## Phase 1: Push Notification Infrastructure

### Task 1: Install expo-notifications and configure

**Files:**
- Modify: `app.json`
- Modify: `package.json`

- [ ] **Step 1: Install expo-notifications**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
npx expo install expo-notifications
```

- [ ] **Step 2: Add plugin to app.json**

In `app.json`, add to the `plugins` array after the existing entries:

```json
["expo-notifications", {
  "icon": "./assets/notification-icon.png",
  "color": "#101B29"
}]
```

Note: If `assets/notification-icon.png` doesn't exist, create a 96x96 white bell icon on transparent background, or temporarily use `"./assets/icon.png"`.

- [ ] **Step 3: Verify**

```bash
./node_modules/.bin/tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app.json package.json package-lock.json
git commit -m "chore: install expo-notifications and configure plugin"
```

---

### Task 2: Create usePushNotifications hook

**Files:**
- Create: `hooks/usePushNotifications.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { pushService } from '@/services/push';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData.data;
}

function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as
    | { type?: string; id?: string }
    | undefined;

  switch (data?.type) {
    case 'post':
      router.push('/(tabs)/community');
      break;
    case 'offer':
    case 'promotion':
    case 'advertiser_approved':
      router.push('/(tabs)/promotions');
      break;
    default:
      router.push('/(tabs)/notifications');
      break;
  }
}

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    registerForPushNotifications().then((token) => {
      if (token) {
        setExpoPushToken(token);
        setPermissionGranted(true);
        pushService.registerToken(token).catch(() => {});
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const disablePush = async () => {
    await pushService.unregisterToken();
    setExpoPushToken(null);
    setPermissionGranted(false);
  };

  const enablePush = async () => {
    const token = await registerForPushNotifications();
    if (token) {
      await pushService.registerToken(token);
      setExpoPushToken(token);
      setPermissionGranted(true);
    }
  };

  return { expoPushToken, permissionGranted, enablePush, disablePush };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
./node_modules/.bin/tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add hooks/usePushNotifications.ts
git commit -m "feat: add usePushNotifications hook with token lifecycle and deep linking"
```

---

### Task 3: Create send-push-notification Edge Function

**Files:**
- Create: `supabase/functions/send-push-notification/index.ts`

- [ ] **Step 1: Create the Edge Function**

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Verify caller is authenticated
  const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await callerClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { property_id, title, message, data, audience, exclude_email } = await req.json();
  if (!property_id || !title || !message) {
    return new Response(
      JSON.stringify({ error: 'property_id, title, and message are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Query profiles with push tokens for this property
  let query = adminClient
    .from('profiles')
    .select('email, push_token')
    .contains('property_ids', [property_id])
    .not('push_token', 'is', null);

  if (audience === 'active') {
    query = query.eq('status', 'active');
  }
  if (exclude_email) {
    query = query.neq('email', exclude_email);
  }

  const { data: profiles, error: queryError } = await query;
  if (queryError) {
    return new Response(JSON.stringify({ error: queryError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const tokens = (profiles ?? []).filter((p) => p.push_token).map((p) => p.push_token!);
  const emails = (profiles ?? []).map((p) => p.email);

  // Send push notifications in batches of 100
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < tokens.length; i += 100) {
    const batch = tokens.slice(i, i + 100);
    const messages = batch.map((token) => ({
      to: token,
      title,
      body: message,
      data: data ?? {},
      sound: 'default' as const,
    }));

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(messages),
      });
      const result = await response.json();

      if (Array.isArray(result.data)) {
        for (const ticket of result.data) {
          if (ticket.status === 'ok') sent++;
          else failed++;
        }
      } else {
        sent += batch.length;
      }
    } catch {
      failed += batch.length;
    }
  }

  // Insert notification records for ALL targeted users
  const notificationType = data?.type ?? 'broadcast';
  const notificationRecords = emails.map((email) => ({
    user_email: email,
    property_id,
    type: notificationType,
    title,
    message,
    data: data ?? null,
    read: false,
  }));

  if (notificationRecords.length > 0) {
    await adminClient.from('notifications').insert(notificationRecords);
  }

  return new Response(
    JSON.stringify({ sent, failed, total: tokens.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/send-push-notification/
git commit -m "feat: add send-push-notification Edge Function with batch delivery"
```

---

### Task 4: Replace sendPush stub + wire push triggers

**Files:**
- Modify: `services/admin.ts` (lines 43-54)
- Modify: `app/(tabs)/promotions/create.tsx`
- Modify: `app/(tabs)/community/create.tsx`
- Modify: `app/(admin)/advertisers.tsx`

- [ ] **Step 1: Replace sendPush stub in admin.ts**

Replace lines 43-54 in `services/admin.ts`:

```typescript
  async sendPush(params: {
    property_id: string;
    title: string;
    message: string;
    data?: { type: string; id?: string };
    audience?: 'all' | 'active';
    exclude_email?: string;
  }): Promise<{ sent: number; failed: number }> {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: params,
    });
    if (error) throw error;
    return data;
  },
```

- [ ] **Step 2: Wire push trigger in promotions/create.tsx**

After the successful `postsService.create()` call, add (fire-and-forget):

```typescript
// After: Toast.show({ type: 'success', ... });
// Before: router.back();
if (business) {
  adminService.sendPush({
    property_id: propertyId,
    title: `${business.business_name} posted an offer`,
    message: data.title,
    data: { type: 'offer' },
    exclude_email: user?.email ?? undefined,
  }).catch(() => {});
}
```

Add `import { adminService } from '@/services/admin';` at top. Add `const { user } = useAuth();` if not already destructured.

- [ ] **Step 3: Wire push trigger in community/create.tsx**

After the successful `postsService.create()` call, add:

```typescript
if (business) {
  const titleMap: Record<string, string> = {
    announcement: `New announcement from ${business.business_name}`,
    event: `${business.business_name} is hosting an event`,
  };
  adminService.sendPush({
    property_id: propertyIds[0],
    title: titleMap[data.type] ?? `New post from ${business.business_name}`,
    message: data.title,
    data: { type: 'post' },
    exclude_email: user?.email ?? undefined,
  }).catch(() => {});
}
```

Add `import { adminService } from '@/services/admin';` at top.

- [ ] **Step 4: Wire push trigger in admin/advertisers.tsx**

In the `handleUpdateStatus` function, after the successful `updateStatus` call, when `newStatus === 'approved'`, add:

```typescript
if (newStatus === 'approved') {
  adminService.sendPush({
    property_id: activePropertyId,
    title: `New local deal from ${promotion.business_name}`,
    message: promotion.headline,
    data: { type: 'advertiser_approved' },
  }).catch(() => {});
}
```

Add `import { adminService } from '@/services/admin';` at top if not already imported.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
./node_modules/.bin/tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add services/admin.ts "app/(tabs)/promotions/create.tsx" "app/(tabs)/community/create.tsx" "app/(admin)/advertisers.tsx"
git commit -m "feat: wire push notifications on post/offer/advertiser creation and approval"
```

---

### Task 5: Add push toggle to profile settings

**Files:**
- Modify: `app/(tabs)/profile.tsx`
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Wire usePushNotifications in tab layout and pass to profile**

In `app/(tabs)/_layout.tsx`, add the push hook call and pass token state via the Notifications tab (the hook auto-registers on mount):

Add at top of `TabLayout` function body:
```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';

// Inside TabLayout():
const { user, propertyIds } = useAuth(); // expand existing useAuth destructure
usePushNotifications(); // register push on tab mount
```

- [ ] **Step 2: Add push toggle to profile.tsx**

In `app/(tabs)/profile.tsx`, add a Switch for push notifications in the Settings section. Import the hook and add the toggle:

```typescript
import { Switch } from 'react-native';
import { usePushNotifications } from '@/hooks/usePushNotifications';

// Inside ProfileScreen():
const { permissionGranted, enablePush, disablePush } = usePushNotifications();

// In settings section, before the Log Out button:
<View className="flex-row justify-between items-center py-3">
  <Text className="text-brand-navy">Push Notifications</Text>
  <Switch
    value={permissionGranted}
    onValueChange={(enabled) => {
      if (enabled) enablePush();
      else disablePush();
    }}
    trackColor={{ false: '#D1D5DB', true: BRAND.blue }}
    thumbColor={permissionGranted ? BRAND.navy : '#F3F4F6'}
  />
</View>
```

- [ ] **Step 3: Verify and commit**

```bash
./node_modules/.bin/tsc --noEmit
git add "app/(tabs)/profile.tsx" "app/(tabs)/_layout.tsx"
git commit -m "feat: add push notification toggle to profile and register on tab mount"
```

---

## Phase 2: Screens + Hooks

### Task 6: Create useNotifications and useUnreadCount hooks

**Files:**
- Create: `hooks/useNotifications.ts`
- Create: `hooks/useUnreadCount.ts`

- [ ] **Step 1: Create useNotifications**

```typescript
import { useQuery } from '@tanstack/react-query';
import { notificationsService, type Notification } from '@/services/notifications';

export function useNotifications(userEmail: string, propertyId: string) {
  return useQuery<Notification[]>({
    queryKey: ['notifications', userEmail, propertyId],
    queryFn: () =>
      notificationsService.filter({
        user_email: userEmail,
        property_id: propertyId,
      }),
    enabled: !!userEmail && !!propertyId,
  });
}
```

- [ ] **Step 2: Create useUnreadCount**

```typescript
import { useQuery } from '@tanstack/react-query';
import { notificationsService } from '@/services/notifications';

export function useUnreadCount(userEmail: string, propertyId: string) {
  return useQuery<number>({
    queryKey: ['unreadCount', userEmail, propertyId],
    queryFn: () => notificationsService.getUnreadCount(userEmail, propertyId),
    enabled: !!userEmail && !!propertyId,
    refetchInterval: 30000,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add hooks/useNotifications.ts hooks/useUnreadCount.ts
git commit -m "feat: add useNotifications and useUnreadCount hooks"
```

---

### Task 7: Implement Notifications tab

**Files:**
- Modify: `app/(tabs)/notifications.tsx` (replace placeholder)

- [ ] **Step 1: Replace notifications screen**

```typescript
import { View, Text, FlatList, Pressable } from 'react-native';
import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Megaphone, Users, CheckCircle } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useAuth } from '@/lib/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { notificationsService } from '@/services/notifications';
import { BRAND } from '@/constants/colors';
import type { LucideIcon } from 'lucide-react-native';

const TYPE_ICONS: Record<string, LucideIcon> = {
  broadcast: Bell,
  offer: Megaphone,
  post: Users,
  advertiser_approved: CheckCircle,
};

export default function NotificationsScreen() {
  const { user, propertyIds } = useAuth();
  const email = user?.email ?? '';
  const propertyId = propertyIds[0] ?? '';
  const queryClient = useQueryClient();

  const { data: notifications, isLoading, refetch } = useNotifications(email, propertyId);
  const { data: unreadCount } = useUnreadCount(email, propertyId);

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllRead(email, propertyId);
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      await queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
      Toast.show({ type: 'success', text1: 'All marked as read' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to mark as read' });
    }
  };

  const handleTap = async (notification: { id: string; read: boolean; type: string; data?: unknown }) => {
    if (!notification.read) {
      notificationsService.update(notification.id, { read: true }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    }

    const dataObj = notification.data as { type?: string } | null;
    const navType = dataObj?.type ?? notification.type;

    switch (navType) {
      case 'post':
        router.push('/(tabs)/community');
        break;
      case 'offer':
      case 'promotion':
      case 'advertiser_approved':
        router.push('/(tabs)/promotions');
        break;
      default:
        break;
    }
  };

  if (isLoading && !notifications) return <LoadingScreen />;

  return (
    <View className="flex-1 bg-white">
      <GradientHeader>
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-white">Notifications</Text>
          {(unreadCount ?? 0) > 0 && (
            <Pressable onPress={handleMarkAllRead}>
              <Text className="text-brand-steel text-sm">Mark all read</Text>
            </Pressable>
          )}
        </View>
      </GradientHeader>

      <FlatList
        data={notifications ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ flexGrow: 1 }}
        renderItem={({ item }) => {
          const Icon = TYPE_ICONS[item.type] ?? Bell;
          const timeAgo = formatDistanceToNow(new Date(item.created_date), { addSuffix: true });

          return (
            <Pressable
              onPress={() => handleTap(item)}
              className="flex-row items-start px-4 py-3 border-b border-gray-50"
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#F9FAFB' : item.read ? '#FFFFFF' : '#F0F4FF',
              })}
            >
              <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mt-0.5">
                <Icon size={16} color={item.read ? BRAND.steel : BRAND.navy} />
              </View>
              <View className="flex-1 ml-3">
                <Text
                  className={`text-sm ${item.read ? 'text-brand-navy' : 'text-brand-navy font-semibold'}`}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text className="text-xs text-brand-steel mt-0.5" numberOfLines={1}>
                  {item.message}
                </Text>
                <Text className="text-xs text-brand-steel mt-1">{timeAgo}</Text>
              </View>
              {!item.read && (
                <View className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            message="You'll see updates from your property here"
          />
        }
        onRefresh={refetch}
        refreshing={false}
      />
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(tabs)/notifications.tsx"
git commit -m "feat: implement Notifications tab with inbox, mark read, and deep linking"
```

---

### Task 8: Wire tab badge count

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Add useUnreadCount to tab layout**

In `app/(tabs)/_layout.tsx`, import and wire the badge:

```typescript
import { useUnreadCount } from '@/hooks/useUnreadCount';

// Inside TabLayout(), after existing hooks:
const { user, propertyIds, isAdmin } = useAuth();
const { data: unreadCount } = useUnreadCount(user?.email ?? '', propertyIds[0] ?? '');
```

Update the notifications Tabs.Screen to include the badge:

```tsx
<Tabs.Screen
  name="notifications"
  options={{
    title: 'Alerts',
    tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
    tabBarBadge: unreadCount && unreadCount > 0 ? unreadCount : undefined,
  }}
/>
```

- [ ] **Step 2: Verify and commit**

```bash
./node_modules/.bin/tsc --noEmit
git add "app/(tabs)/_layout.tsx"
git commit -m "feat: add notification badge count to tab bar"
```

---

### Task 9: Admin Push Screen

**Files:**
- Create: `app/(admin)/push.tsx`
- Modify: `app/(admin)/_layout.tsx`
- Modify: `app/(admin)/index.tsx`

- [ ] **Step 1: Create push compose screen**

```typescript
import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import Toast from 'react-native-toast-message';
import { Bell, Send } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { PropertySelector } from '@/components/admin/PropertySelector';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/lib/AuthContext';
import { adminService } from '@/services/admin';
import { useNotifications } from '@/hooks/useNotifications';
import { BRAND } from '@/constants/colors';
import { formatDistanceToNow } from 'date-fns';

const AUDIENCES = ['All Tenants', 'Active Only'];

export default function AdminPushScreen() {
  const { propertyIds, user } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState(propertyIds[0] ?? '');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('All Tenants');
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: recentNotifications } = useNotifications(user?.email ?? '', selectedProperty);
  const broadcastHistory = (recentNotifications ?? [])
    .filter((n) => n.type === 'broadcast')
    .slice(0, 20);

  const handleSend = async () => {
    setShowConfirm(false);
    setSending(true);
    try {
      const result = await adminService.sendPush({
        property_id: selectedProperty,
        title,
        message,
        audience: audience === 'Active Only' ? 'active' : 'all',
        data: { type: 'broadcast' },
      });
      Toast.show({
        type: 'success',
        text1: 'Push sent!',
        text2: `Delivered to ${result.sent} device${result.sent !== 1 ? 's' : ''}`,
      });
      setTitle('');
      setMessage('');
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Send failed', text2: String(err) });
    } finally {
      setSending(false);
    }
  };

  const canSend = title.trim().length > 0 && message.trim().length > 0 && selectedProperty;

  return (
    <ScrollView className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Push Notifications</Text>
      </GradientHeader>

      <View className="px-4 pt-2">
        <PropertySelector
          propertyIds={propertyIds}
          selected={selectedProperty}
          onSelect={setSelectedProperty}
        />
      </View>

      <View className="px-4 mt-4">
        <Text className="text-lg font-semibold text-brand-navy mb-3">Compose</Text>

        <View className="mb-3">
          <Input
            label={`Title (${title.length}/50)`}
            value={title}
            onChangeText={(t) => setTitle(t.slice(0, 50))}
            placeholder="Notification title"
          />
        </View>
        <View className="mb-3">
          <Input
            label={`Message (${message.length}/200)`}
            value={message}
            onChangeText={(m) => setMessage(m.slice(0, 200))}
            placeholder="Notification message"
            multiline
            numberOfLines={3}
          />
        </View>

        <Text className="text-sm font-medium text-brand-navy mb-1">Audience</Text>
        <SegmentedControl segments={AUDIENCES} selected={audience} onChange={setAudience} />

        {title.trim() && message.trim() && (
          <View className="mt-4">
            <Text className="text-sm font-medium text-brand-steel mb-2">Preview</Text>
            <Card className="p-3 flex-row items-start">
              <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                <Bell size={16} color={BRAND.navy} />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-sm font-semibold text-brand-navy">{title}</Text>
                <Text className="text-xs text-brand-steel mt-0.5">{message}</Text>
              </View>
            </Card>
          </View>
        )}

        <Button
          onPress={() => setShowConfirm(true)}
          loading={sending}
          disabled={!canSend}
          className="mt-4"
        >
          Send Notification
        </Button>
      </View>

      {broadcastHistory.length > 0 && (
        <View className="px-4 mt-6 mb-8">
          <Text className="text-lg font-semibold text-brand-navy mb-3">Sent History</Text>
          {broadcastHistory.map((n) => (
            <View key={n.id} className="py-2 border-b border-gray-50">
              <Text className="text-sm font-medium text-brand-navy">{n.title}</Text>
              <Text className="text-xs text-brand-steel">{n.message}</Text>
              <Text className="text-xs text-brand-steel mt-1">
                {formatDistanceToNow(new Date(n.created_date), { addSuffix: true })}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Modal
        visible={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirm Send"
        actions={[
          { label: 'Cancel', onPress: () => setShowConfirm(false), variant: 'secondary' },
          { label: 'Send', onPress: handleSend, variant: 'primary' },
        ]}
      >
        <Text className="text-brand-steel">
          Send push notification to {audience === 'Active Only' ? 'active' : 'all'} tenants?
        </Text>
      </Modal>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Register push screen in admin layout**

Add to `app/(admin)/_layout.tsx`:

```tsx
<Stack.Screen name="push" />
```

- [ ] **Step 3: Add "Send Push" link to admin dashboard**

In `app/(admin)/index.tsx`, add a navigation button after the "Pending Approvals" row:

```tsx
<Pressable
  onPress={() => router.push('/(admin)/push')}
  className="flex-row items-center justify-between bg-blue-50 rounded-xl p-4 mt-3"
>
  <Text className="text-blue-700 font-medium">Send Push Notification</Text>
  <ChevronRight size={18} color="#1D4ED8" />
</Pressable>
```

- [ ] **Step 4: Verify and commit**

```bash
./node_modules/.bin/tsc --noEmit
git add "app/(admin)/push.tsx" "app/(admin)/_layout.tsx" "app/(admin)/index.tsx"
git commit -m "feat: implement Admin Push screen with compose, preview, confirm, and history"
```

---

## Phase 3: UI Polish

### Task 10: Systematic UI polish pass

**Files:** Multiple screens (audit and fix inline)

- [ ] **Step 1: Dispatch a subagent to audit all screens for polish issues**

The subagent should read every screen file and check:
- Consistent `px-4` horizontal padding on content
- `gap-3` or `gap-12` (12px) between list items (via contentContainerStyle)
- LoadingScreen shown during initial data fetch
- EmptyState component on all list screens
- Toast.show on all mutation success/error
- Inline error messages on all form fields
- KeyboardAvoidingView or `keyboardShouldPersistTaps="handled"` on all form ScrollViews
- Safe area handling (GradientHeader on top, tab bar on bottom)

Fix any gaps found directly.

- [ ] **Step 2: Commit fixes**

```bash
git add -A
git commit -m "fix: UI polish pass — consistent spacing, loading, empty, error states"
```

---

## Phase 4: Testing

### Task 11: Set up Jest and write tests

**Files:**
- Create: `jest.config.js`
- Modify: `package.json` (add test script)
- Create: `__tests__/services/businesses.test.ts`
- Create: `__tests__/components/StatusBadge.test.tsx`

- [ ] **Step 1: Create Jest config**

```javascript
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@tanstack/.*|date-fns|lucide-react-native)',
  ],
};
```

- [ ] **Step 2: Add test script to package.json**

```json
"test": "jest --passWithNoTests",
"test:watch": "jest --watch"
```

- [ ] **Step 3: Create a service unit test**

Create `__tests__/services/businesses.test.ts`:

```typescript
import { businessesService } from '@/services/businesses';

// Mock supabase
jest.mock('@/services/supabase', () => {
  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
  };
  return {
    supabase: {
      from: jest.fn(() => ({
        ...mockQuery,
        then: jest.fn().mockResolvedValue({ data: [], error: null }),
      })),
    },
  };
});

describe('businessesService', () => {
  it('exports filter, getById, create, update methods', () => {
    expect(typeof businessesService.filter).toBe('function');
    expect(typeof businessesService.getById).toBe('function');
    expect(typeof businessesService.create).toBe('function');
    expect(typeof businessesService.update).toBe('function');
  });
});
```

- [ ] **Step 4: Create a component test**

Create `__tests__/components/StatusBadge.test.tsx`:

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { StatusBadge } from '@/components/ui/StatusBadge';

describe('StatusBadge', () => {
  it('renders the status label capitalized', () => {
    const { getByText } = render(<StatusBadge status="active" />);
    expect(getByText('Active')).toBeTruthy();
  });

  it('renders all 6 statuses without crashing', () => {
    const statuses = ['invited', 'active', 'inactive', 'pending', 'approved', 'rejected'] as const;
    for (const status of statuses) {
      const { getByText } = render(<StatusBadge status={status} />);
      expect(getByText(status.charAt(0).toUpperCase() + status.slice(1))).toBeTruthy();
    }
  });
});
```

- [ ] **Step 5: Run tests**

```bash
npx jest --passWithNoTests
```

- [ ] **Step 6: Commit**

```bash
git add jest.config.js package.json "__tests__/"
git commit -m "feat: set up Jest with service and component tests"
```

---

### Task 12: Create Maestro E2E flow files

**Files:**
- Create: `maestro/flow-1-invited-tenant.yaml`
- Create: `maestro/flow-2-self-registration.yaml`
- Create: `maestro/flow-3-create-offer.yaml`
- Create: `maestro/flow-4-admin-approve.yaml`
- Create: `maestro/flow-5-push-broadcast.yaml`
- Create: `maestro/flow-6-profile-edit.yaml`

- [ ] **Step 1: Create all 6 Maestro flow files**

These are skeleton flows — each contains the key steps. Actual selectors need tuning on real device.

Create `maestro/flow-3-create-offer.yaml` (example):

```yaml
appId: com.unitapp.mobile
name: Create Offer Flow
---
- launchApp
- tapOn: "Promotions"
- assertVisible: "Promotions"
- tapOn:
    id: "fab-button"
- assertVisible: "Post an Offer"
- tapOn: "Title"
- inputText: "Half-price coffee this Friday"
- tapOn: "Description"
- inputText: "Come visit us for 50% off all drinks"
- tapOn: "Post Offer"
- assertVisible: "Offer posted!"
```

Create similar flows for all 6 paths (adapt steps to each critical path per spec).

- [ ] **Step 2: Commit**

```bash
git add maestro/
git commit -m "feat: add Maestro E2E flow skeletons for 6 critical paths"
```

---

## Phase 5: CI/CD + Deploy

### Task 13: GitHub Actions CI + EAS config

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `package.json` (add build:web script)

- [ ] **Step 1: Create CI workflow**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: TypeScript check
        run: npx tsc --noEmit
      - name: Run tests
        run: npx jest --ci --passWithNoTests
```

- [ ] **Step 2: Add build:web script to package.json**

```json
"build:web": "npx expo export --platform web"
```

- [ ] **Step 3: Commit**

```bash
git add .github/ package.json
git commit -m "feat: add GitHub Actions CI pipeline and web build script"
```

---

## Phase 6: Documentation

### Task 14: Write handoff documentation

**Files:**
- Create: `docs/deployment-runbook.md`
- Create: `docs/edge-functions.md`
- Create: `docs/monetization-architecture.md`

- [ ] **Step 1: Create deployment runbook**

Document: local dev setup, EAS build commands (dev/preview/production), app store submission (`eas submit`), web admin deploy (`expo export --platform web`), OTA updates (`eas update`), environment variables reference.

- [ ] **Step 2: Create Edge Function documentation**

Document all 4 Edge Functions with input/output/process/auth for each: invite-tenant, complete-onboarding, add-property-to-admin, send-push-notification.

- [ ] **Step 3: Create monetization architecture notes**

Per spec Section 13: document extension points (paid advertiser placements, sponsored posts, premium profiles, property subscriptions) with future SQL examples. No code changes.

- [ ] **Step 4: Commit all docs**

```bash
git add docs/
git commit -m "docs: add deployment runbook, Edge Function docs, and monetization architecture"
```

---

## Final Verification

- [ ] **Step 1: Full TypeScript check**

```bash
./node_modules/.bin/tsc --noEmit
```
Expected: EXIT=0

- [ ] **Step 2: Run tests**

```bash
npx jest --passWithNoTests
```
Expected: All tests pass

- [ ] **Step 3: Verify git is clean**

```bash
git status
```
Expected: nothing to commit, working tree clean

---

## Summary

| Phase | Tasks | Key Deliverables |
|-------|-------|-----------------|
| **Phase 1** | Tasks 1-5 | expo-notifications, usePushNotifications, Edge Function, push triggers, push toggle |
| **Phase 2** | Tasks 6-9 | Notifications tab, useNotifications, useUnreadCount, tab badge, Admin push screen |
| **Phase 3** | Task 10 | UI polish audit and fixes |
| **Phase 4** | Tasks 11-12 | Jest setup, unit/component tests, Maestro E2E skeletons |
| **Phase 5** | Task 13 | GitHub Actions CI, web build script |
| **Phase 6** | Task 14 | Deployment runbook, Edge Function docs, monetization notes |
| **Total** | 14 tasks | ~25 files created/modified |
