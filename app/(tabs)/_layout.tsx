import { Tabs } from 'expo-router';
import { Building2, Megaphone, Users, Bell, User, Shield } from 'lucide-react-native';
import { useAuth } from '@/lib/AuthContext';
import { BRAND } from '@/constants/colors';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useUnreadCount } from '@/hooks/useUnreadCount';

export default function TabLayout() {
  const { isAdmin, user, propertyIds } = useAuth();
  usePushNotifications();

  const { data: unreadCount } = useUnreadCount(user?.email ?? '', propertyIds[0] ?? '');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND.navy,
        tabBarInactiveTintColor: BRAND.steel,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: BRAND.gray,
        },
      }}
    >
      <Tabs.Screen
        name="directory"
        options={{
          title: 'Directory',
          tabBarIcon: ({ color, size }) => <Building2 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="promotions"
        options={{
          title: 'Promotions',
          tabBarIcon: ({ color, size }) => <Megaphone size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
          tabBarBadge: unreadCount && unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          href: isAdmin ? '/(tabs)/admin' : null,
          title: 'Admin',
          tabBarIcon: ({ color, size }) => <Shield size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
