# Milestone 3: Completion & Release — Design Spec

**Date:** 2026-04-05
**Parent Spec:** `2026-04-04-expo-mobile-rebuild-design.md`
**Scope:** Push notifications, Notifications tab, Admin push screen, UI polish, testing, CI/CD, app store submission, documentation
**Deadline:** May 1, 2026 (contract: $4,999 payment)

---

## 1. Push Notification Infrastructure (Phase 1)

### 1.1: Install and Configure `expo-notifications`

**Install:** `npx expo install expo-notifications`

**app.json plugin config:**
```json
["expo-notifications", {
  "icon": "./assets/notification-icon.png",
  "color": "#101B29"
}]
```

Android channel configuration handled by Expo's default channel. No FCM config needed — Expo Push API abstracts APNs + FCM via EAS project ID.

### 1.2: `usePushNotifications` Hook

**File:** `hooks/usePushNotifications.ts`

Lifecycle per spec Section 9 (lines 526-535):

```
App launch (authenticated) → getPermissionsAsync()
  → If not granted: requestPermissionsAsync()
  → If granted: getExpoPushTokenAsync({ projectId })
  → Store in profiles.push_token if changed
User logout → Clear profiles.push_token
```

**Implementation:**
- Called once in `app/(tabs)/_layout.tsx` (TabLayout component), which only renders when user is fully authenticated past all auth guards. This ensures the hook runs only for authenticated users who have completed onboarding.
- On mount: check/request permission → get token → compare with profile.push_token → update if different via `pushService.registerToken(token)`
- Notification received listener (foreground): show notification banner via `Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: true }) })`
- Notification response listener (tap): extract `data.type` from response → navigate:
  - `type === 'post'` → `router.push('/(tabs)/community')`
  - `type === 'promotion'` → `router.push('/(tabs)/promotions')`
  - `type === 'offer'` → `router.push('/(tabs)/promotions')`
  - `type === 'advertiser_approved'` → `router.push('/(tabs)/promotions')`
  - default → `router.push('/(tabs)/notifications')`
- Cleanup: remove both listeners on unmount
- Returns `{ expoPushToken: string | null, permissionGranted: boolean }`

### 1.3: `send-push-notification` Edge Function

**File:** `supabase/functions/send-push-notification/index.ts`

Per spec Section 10 (lines 581-591):

**Input:** `{ property_id, title, message, data?, audience?, exclude_email? }`

**Process:**
1. Validate Authorization header, verify authenticated user
2. Query profiles with non-null push_token for target property: `profiles.property_ids @> [property_id] AND push_token IS NOT NULL`
3. Apply audience filter: if `audience === 'active'`, add `AND status = 'active'`
4. Exclude sender if `exclude_email` provided: `AND email != exclude_email`
5. Build Expo push messages array: `{ to: token, title, body: message, data, sound: 'default' }`
6. Batch send to `https://exp.host/--/api/v2/push/send` in chunks of 100
7. Insert notification records into `notifications` table for ALL targeted users (regardless of push delivery): `{ user_email, property_id, type: data?.type ?? 'broadcast', title, message, data, read: false }`
8. Return `{ sent: number, failed: number }`

**Auth:** Requires authenticated user (any role — tenants send via post creation, admins send broadcasts)

**Error handling:** Per-chunk error tracking. Failed tokens logged but don't block remaining sends.

### 1.4: Replace `adminService.sendPush()` Stub

**File:** `services/admin.ts` (lines 43-54)

Replace `console.warn` stub with actual Edge Function invocation:
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

### 1.5: Wire Push Triggers on Create Flows

**`app/(tabs)/promotions/create.tsx`** — after `postsService.create()` succeeds:
```typescript
adminService.sendPush({
  property_id: propertyIds[0],
  title: `${business.business_name} posted an offer`,
  message: data.title,
  data: { type: 'offer' },
  exclude_email: user.email,
}).catch(() => {}); // fire-and-forget, don't block UI
```

**`app/(tabs)/community/create.tsx`** — after `postsService.create()` succeeds:
```typescript
const titleMap = {
  announcement: `New announcement from ${business.business_name}`,
  event: `${business.business_name} is hosting an event`,
};
adminService.sendPush({
  property_id: propertyIds[0],
  title: titleMap[data.type],
  message: data.title,
  data: { type: 'post' },
  exclude_email: user.email,
}).catch(() => {});
```

**`app/(admin)/advertisers.tsx`** — after `updateStatus` to 'approved':
```typescript
adminService.sendPush({
  property_id: selectedProperty,
  title: `New local deal from ${promotion.business_name}`,
  message: promotion.headline,
  data: { type: 'advertiser_approved' },
}).catch(() => {});
```

All push triggers are fire-and-forget (`.catch(() => {})`) — UI doesn't wait for delivery confirmation.

### 1.6: Profile Push Toggle

**File:** `app/(tabs)/profile.tsx`

Add to Settings section, above "Log Out":
- Switch/toggle for push notifications
- State derived from `expoPushToken !== null` (from usePushNotifications)
- Toggle off: `pushService.unregisterToken()`
- Toggle on: re-request permission, get token, `pushService.registerToken(token)`

---

## 2. Screens (Phase 2)

### 2.1: Notifications Tab

**File:** `app/(tabs)/notifications.tsx` (replace placeholder)

**Layout:**
- GradientHeader "Notifications" with "Mark all read" Pressable (right side, only visible when unread > 0)
- FlatList of notification rows, reverse-chronological

**Each row:**
- Left: icon by `notification.type`:
  - `broadcast` → Bell
  - `offer` → Megaphone
  - `post` → Users
  - `advertiser_approved` → CheckCircle
  - default → Bell
- Center: title (font-semibold if !read, font-normal if read), message (1-line clamp, text-brand-steel), relative timestamp
- Right: blue dot indicator if unread

**Interactions:**
- Tap → navigate by `notification.data?.type` (same mapping as push response handler in 1.2)
- After tap, mark that notification as read: `notificationsService.update(id, { read: true })` → invalidate
- "Mark all read" → `notificationsService.markAllRead(email, propertyId)` → invalidate queries
- Pull-to-refresh
- EmptyState with Bell icon: "No notifications yet"

**Data:** `useNotifications(userEmail, propertyId)` hook

### 2.2: `useNotifications` Hook

**File:** `hooks/useNotifications.ts`

```typescript
useQuery<Notification[]>({
  queryKey: ['notifications', userEmail, propertyId],
  queryFn: () => notificationsService.filter({ user_email: userEmail, property_id: propertyId }),
  enabled: !!userEmail && !!propertyId,
})
```

### 2.3: `useUnreadCount` Hook

**File:** `hooks/useUnreadCount.ts`

```typescript
useQuery<number>({
  queryKey: ['unreadCount', userEmail, propertyId],
  queryFn: () => notificationsService.getUnreadCount(userEmail, propertyId),
  enabled: !!userEmail && !!propertyId,
  refetchInterval: 30000, // poll every 30s
})
```

### 2.4: Tab Badge Count

**File:** `app/(tabs)/_layout.tsx`

Wire `useUnreadCount` into the notifications tab:
```tsx
const { data: unreadCount } = useUnreadCount(user?.email ?? '', propertyIds[0] ?? '');

<Tabs.Screen
  name="notifications"
  options={{
    title: 'Alerts',
    tabBarIcon: ...,
    tabBarBadge: (unreadCount && unreadCount > 0) ? unreadCount : undefined,
  }}
/>
```

### 2.5: Admin Push Screen

**File:** `app/(admin)/push.tsx` (new)

**Layout:**
- GradientHeader "Push Notifications"
- PropertySelector
- Compose section:
  - Title input (max 50 chars, live char counter: "23/50")
  - Message input (multiline, max 200 chars, live counter)
  - Audience: SegmentedControl "All Tenants" | "Active Only"
- Preview card: Card with Bell icon + title + message (styled like a notification row)
- "Send Notification" button → confirmation Modal ("Send push to all tenants of [property]?") → `adminService.sendPush(...)` → Toast with "Sent to X devices" → clear form
- Sent history section below: FlatList of recent broadcast notifications from `notificationsService.filter({ property_id, type: 'broadcast' })`, limited to 20, reverse-chronological

**Admin layout:** Add `<Stack.Screen name="push" />` to `(admin)/_layout.tsx`

**Admin dashboard:** Add "Send Push" link/button that navigates to `/(admin)/push`

---

## 3. UI Polish (Phase 3)

Systematic audit and fix pass across all screens:

| Check | Where | Expected |
|-------|-------|----------|
| Content padding | All screens | `px-4` (16px) horizontal, `gap-3` (12px) between cards |
| Loading states | All list screens | LoadingScreen spinner while initial fetch |
| Empty states | All list screens | EmptyState component with relevant icon + message |
| Error feedback | All mutations | Toast.show on error with error message |
| Success feedback | All create/update | Toast.show on success |
| Form validation | All forms | Inline error messages below fields (red text) |
| Text hierarchy | All screens | brand-navy for primary, brand-steel for secondary, text-xs for metadata |
| Safe areas | All screens | GradientHeader handles top inset, tab bar handles bottom |
| Pull-to-refresh | All FlatLists | onRefresh + refreshing props |
| Keyboard avoidance | All forms | KeyboardAvoidingView or ScrollView keyboardShouldPersistTaps |

---

## 4. Testing (Phase 4)

### 4.1: Jest Configuration

**Files:**
- Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@tanstack/.*|date-fns|lucide-react-native)'
  ],
  setupFilesAfterSetup: ['@testing-library/react-native/extend-expect'],
};
```
- Add to `package.json` scripts: `"test": "jest", "test:watch": "jest --watch"`
- Install dev deps: `jest-expo` (if not installed)

### 4.2: Unit Tests

| Test File | Tests |
|-----------|-------|
| `__tests__/services/businesses.test.ts` | filter() builds correct query, search adds ilike, getById returns single |
| `__tests__/services/posts.test.ts` | filter() with type, getById, create, update, delete |
| `__tests__/services/notifications.test.ts` | markAllRead filters correctly, getUnreadCount returns number |
| `__tests__/hooks/usePromotions.test.ts` | Merges posts + advertiser_promotions, sorts by date, segment filtering |
| `__tests__/hooks/useTenants.test.ts` | Joins profiles + businesses by email, status filter, search filter |

Mock pattern: mock `@/services/supabase` to return mock Supabase client with chainable query builder.

### 4.3: Component Tests

| Test File | Tests |
|-----------|-------|
| `__tests__/components/BusinessCard.test.tsx` | Renders name, category badge, description clamp; handles missing fields |
| `__tests__/components/PromotionCard.test.tsx` | Tenant variant renders offer data; advertiser variant renders CTA |
| `__tests__/components/StatusBadge.test.tsx` | All 6 statuses render correct colors |

### 4.4: Maestro E2E Flows

**Directory:** `maestro/`

| Flow File | Critical Path |
|-----------|--------------|
| `flow-1-invited-tenant.yaml` | Admin invites → tenant logs in → forced reset → lands on directory |
| `flow-2-self-registration.yaml` | Signup → onboarding wizard → profile created → directory |
| `flow-3-create-offer.yaml` | Promotions tab → FAB → fill form → submit → verify in feed |
| `flow-4-admin-approve.yaml` | Admin → advertisers → approve pending → visible in tenant promotions |
| `flow-5-push-broadcast.yaml` | Admin → push → compose → send → check notifications tab |
| `flow-6-profile-edit.yaml` | Profile → edit → change fields → save → verify updated |

Each flow is a YAML file with Maestro commands (tapOn, inputText, assertVisible). Requires Maestro CLI installed separately.

---

## 5. CI/CD + Build + Deploy (Phase 5)

### 5.1: GitHub Actions CI

**File:** `.github/workflows/ci.yml`

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
      - run: npx tsc --noEmit
      - run: npx jest --ci --passWithNoTests
```

### 5.2: EAS Build + Submit

EAS profiles already configured in `eas.json` (development, preview, production).

**Build commands:**
```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

**Submit commands:**
```bash
eas submit --platform ios
eas submit --platform android
```

Requires: Apple Developer account credentials, Google Play service account key (both client-provided). Add `submit` profiles to `eas.json` if not present.

### 5.3: Web Admin Deploy

Add to `package.json` scripts:
```json
"build:web": "npx expo export --platform web",
"start:web": "npx serve dist"
```

Deploy `dist/` output to Vercel or Netlify. Can be automated via GitHub integration or manual deploy.

---

## 6. Documentation + Handoff (Phase 6)

### 6.1: Deployment Runbook

**File:** `docs/deployment-runbook.md`

Contents:
- How to run locally (iOS simulator, Android emulator, web)
- How to build for production (EAS commands)
- How to submit to app stores
- How to deploy web admin
- How to push OTA updates (`eas update`)
- Environment variables reference (all EXPO_PUBLIC_ vars + Edge Function secrets)

### 6.2: Edge Function Documentation

**File:** `docs/edge-functions.md`

Document all 4 Edge Functions:
- `invite-tenant` — input, process, output, batch handling, rollback
- `complete-onboarding` — input, process, service-role pattern
- `add-property-to-admin` — input, duplicate check, service-role pattern
- `send-push-notification` — input, process, batching, notification records

### 6.3: Monetization Architecture Notes

**File:** `docs/monetization-architecture.md`

Per spec Section 13 — document the extension points (no code):
- Paid advertiser placements (Stripe Checkout before approval)
- Sponsored tenant posts (is_sponsored flag)
- Premium business profiles (tier column)
- Property subscriptions (subscription_tier)
- Future schema extensions (SQL examples from spec)

---

## 7. Implementation Phases

| Phase | Scope | Deliverables |
|-------|-------|-------------|
| **Phase 1** | Push infrastructure | expo-notifications install, usePushNotifications hook, send-push-notification Edge Function, replace sendPush stub, wire push triggers, profile push toggle |
| **Phase 2** | Screens + hooks | Notifications tab, useNotifications hook, useUnreadCount hook, tab badge, Admin push screen, admin layout/dashboard updates |
| **Phase 3** | UI polish | Spacing/loading/empty/error state audit across all screens |
| **Phase 4** | Testing | Jest config, unit tests, component tests, Maestro E2E flows |
| **Phase 5** | CI/CD + Deploy | GitHub Actions, EAS build config, web export, app store submission config |
| **Phase 6** | Documentation | Deployment runbook, Edge Function docs, monetization notes |

## 8. Out of Scope

- Victory-native charts (cut for deadline)
- Multi-user tenant roles
- Advertiser self-service portal
- Email/SMS notification delivery (push + in-app only)
- Stripe integration (monetization is documentation only)
