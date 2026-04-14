import { Tabs } from 'expo-router';
import { Building2, Megaphone, Users, Bell, User } from 'lucide-react-native';
import { useAuth } from '@/lib/AuthContext';
import { BRAND } from '@/constants/colors';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useUnreadCount } from '@/hooks/useUnreadCount';

export default function TabLayout() {
  const { isAdmin, user, propertyIds } = useAuth();
  usePushNotifications();

  const { data: unreadCount } = useUnreadCount(user?.id ?? '', propertyIds[0] ?? '');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: BRAND.steel,
        tabBarStyle: {
          backgroundColor: BRAND.navy,
          borderTopColor: '#1D263A',
        },
        tabBarLabelStyle: {
          fontFamily: 'Nunito_600SemiBold',
          fontSize: 12,
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
          href: isAdmin ? null : undefined,
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      {/* Hide sub-screens from tab bar */}
      <Tabs.Screen name="directory/[id]" options={{ href: null }} />
      <Tabs.Screen name="promotions/create" options={{ href: null }} />
      <Tabs.Screen name="profile/edit" options={{ href: null }} />
      <Tabs.Screen name="community/create" options={{ href: null }} />
    </Tabs>
  );
}
