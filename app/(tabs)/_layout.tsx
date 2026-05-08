import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Home, Building2, Megaphone, Users, Bell, User } from 'lucide-react-native';
import { View } from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { BRAND } from '@/constants/colors';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { getPromotionItems } from '@/hooks/usePromotions';
import { getActivityFeed } from '@/services/activityFeed';
import { businessesService } from '@/services/businesses';
import { notificationsService } from '@/services/notifications';
import { getNearbyPropertyIds } from '@/services/nearbyProperties';
import { postsService, type Post } from '@/services/posts';

// Renders icon with a 2pt brand-blue accent bar above it when the tab is active.
function makeTabIcon(Icon: React.ComponentType<{ size: number; color: string }>) {
  return function TabIconWithIndicator({ color, size, focused }: { color: string; size: number; focused: boolean }) {
    return (
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: 24,
            height: 2,
            borderRadius: 1,
            backgroundColor: focused ? BRAND.blue : 'transparent',
            marginBottom: 2,
          }}
        />
        <Icon size={size} color={color} />
      </View>
    );
  };
}

export default function TabLayout() {
  const { isAdmin, user, propertyIds } = useAuth();
  const queryClient = useQueryClient();
  usePushNotifications();

  const { data: unreadCount } = useUnreadCount(user?.id ?? '', propertyIds[0] ?? '');
  const propertyId = propertyIds[0] ?? '';

  useEffect(() => {
    if (isAdmin || !user || !propertyId) return;

    const warmups = [
      queryClient.prefetchQuery({
        queryKey: ['activityFeed', propertyId, 50],
        queryFn: () => getActivityFeed([propertyId], 50),
      }),
      queryClient.prefetchQuery({
        queryKey: ['nearby-properties', propertyId, 2],
        queryFn: () => getNearbyPropertyIds(propertyId, 2),
      }),
      queryClient.prefetchQuery({
        queryKey: ['businesses', propertyId, { search: undefined, category: undefined }],
        queryFn: () => businessesService.filter({ property_id: propertyId }),
      }),
      queryClient.prefetchQuery({
        queryKey: ['posts', propertyId, { type: undefined, excludeType: 'offer' }],
        queryFn: async () => {
          const posts = await postsService.filter({ property_id: propertyId });
          return posts.filter((post: Post) => post.type !== 'offer');
        },
      }),
      queryClient.prefetchQuery({
        queryKey: ['promotions', propertyId, 'All'],
        queryFn: () => getPromotionItems(propertyId, 'All'),
      }),
      queryClient.prefetchQuery({
        queryKey: ['notifications', user.id, propertyId],
        queryFn: () =>
          notificationsService.filter({
            user_id: user.id,
            property_id: propertyId,
          }),
      }),
    ];

    const email = user.email;

    if (email) {
      warmups.push(
        queryClient.prefetchQuery({
          queryKey: ['currentUser', email],
          queryFn: async () => {
            const businesses = await businessesService.filter({ owner_email: email });
            return businesses[0] ?? null;
          },
        })
      );
    }

    Promise.allSettled(warmups).catch(() => {});
  }, [isAdmin, propertyId, queryClient, user]);

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#A4B5CC',
        tabBarStyle: {
          backgroundColor: BRAND.navy,
          borderTopWidth: 0.5,
          borderTopColor: BRAND.navyLight,
          height: 88,
        },
        tabBarLabelStyle: {
          fontFamily: 'Nunito_600SemiBold',
          fontSize: 11,
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          // Home tab is tenant-only; admins keep their existing landing.
          href: isAdmin ? null : undefined,
          title: 'Home',
          tabBarIcon: makeTabIcon(Home),
          tabBarButtonTestID: 'tab-home',
        }}
      />
      <Tabs.Screen
        name="directory"
        options={{
          title: 'Directory',
          tabBarIcon: makeTabIcon(Building2),
          tabBarButtonTestID: 'tab-directory',
        }}
      />
      <Tabs.Screen
        name="promotions"
        options={{
          title: 'Promotions',
          tabBarIcon: makeTabIcon(Megaphone),
          tabBarButtonTestID: 'tab-promotions',
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: makeTabIcon(Users),
          tabBarButtonTestID: 'tab-community',
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: makeTabIcon(Bell),
          tabBarBadge: unreadCount && unreadCount > 0 ? unreadCount : undefined,
          tabBarButtonTestID: 'tab-alerts',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: isAdmin ? null : undefined,
          title: 'Profile',
          tabBarIcon: makeTabIcon(User),
          tabBarButtonTestID: 'tab-profile',
        }}
      />
    </Tabs>
  );
}
