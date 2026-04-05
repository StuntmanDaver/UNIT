import { View, Text, Pressable } from 'react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/AuthContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function ProfileScreen() {
  const { user, logout, isAdmin } = useAuth();
  const { data: business } = useCurrentUser();

  return (
    <View className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Profile</Text>
        <Text className="text-brand-steel text-sm">{user?.email}</Text>
      </GradientHeader>
      <View className="flex-1 px-6 pt-6">
        {business && (
          <View className="bg-brand-gray/30 rounded-xl p-4 mb-6">
            <Text className="text-lg font-semibold text-brand-navy">{business.business_name}</Text>
            <Text className="text-brand-steel text-sm mt-1">{business.category}</Text>
          </View>
        )}

        {isAdmin && (
          <View className="bg-blue-50 rounded-xl p-4 mb-6">
            <Text className="text-blue-700 font-semibold">Admin Access</Text>
            <Text className="text-blue-600 text-sm mt-1">
              Admin features coming in Milestone 2
            </Text>
          </View>
        )}

        <Button onPress={logout} variant="destructive" className="mt-auto mb-8">
          Log Out
        </Button>
      </View>
    </View>
  );
}
