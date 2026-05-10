import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut } from 'lucide-react-native';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/Button';

export default function PendingApprovalScreen() {
  const { profile, refreshProfile, logout, isInactive } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-brand-cloud px-6" style={{ paddingTop: insets.top + 24 }}>
      <View className="flex-1 justify-center">
        <Text className="font-lora-semibold text-3xl text-brand-ink mb-3">
          {isInactive ? 'Account disabled' : 'Approval pending'}
        </Text>
        <Text className="font-nunito text-base leading-6 text-brand-ink-muted mb-8">
          {isInactive
            ? 'Your tenant access is currently disabled. Contact your property administrator to restore access.'
            : 'Your business profile was created and is waiting for a property administrator to approve it.'}
        </Text>

        <Button onPress={refreshProfile} className="mb-3">
          Check Status
        </Button>

        <Pressable onPress={logout} className="py-3 items-center">
          <View className="flex-row items-center gap-2">
            <LogOut size={18} color="#B91C1C" />
            <Text className="font-nunito-semibold text-sm text-red-700">Sign out</Text>
          </View>
        </Pressable>

        {profile?.email ? (
          <Text className="font-nunito text-sm text-brand-ink-muted text-center mt-8">{profile.email}</Text>
        ) : null}
      </View>
    </View>
  );
}
