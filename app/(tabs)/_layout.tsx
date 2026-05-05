import { Tabs } from 'expo-router';
import { Home, Building2, Megaphone, Users, Bell, User } from 'lucide-react-native';
import { View } from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { BRAND } from '@/constants/colors';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useUnreadCount } from '@/hooks/useUnreadCount';

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
  usePushNotifications();

  const { data: unreadCount } = useUnreadCount(user?.id ?? '', propertyIds[0] ?? '');

  return (
    <Tabs
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
      {/* Hide sub-screens from tab bar */}
      <Tabs.Screen name="directory/[id]" options={{ href: null }} />
      <Tabs.Screen name="promotions/create" options={{ href: null }} />
      <Tabs.Screen name="promotions/[id]" options={{ href: null }} />
      <Tabs.Screen name="promotions/pending-payment" options={{ href: null }} />
      <Tabs.Screen name="profile/edit" options={{ href: null }} />
      <Tabs.Screen name="community/create" options={{ href: null }} />
    </Tabs>
  );
}
