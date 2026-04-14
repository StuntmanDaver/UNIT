import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { ChevronLeft, LogOut } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/lib/AuthContext';
import { BRAND } from '@/constants/colors';

export default function AdminProfileScreen() {
  const { user, logout } = useAuth();
  const { permissionGranted, enablePush, disablePush } = usePushNotifications();

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View className="flex-1 bg-brand-navy">
      <GradientHeader>
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <ChevronLeft size={24} color={BRAND.gray} />
          </Pressable>
          <Text className="text-2xl font-lora-semibold text-white leading-tight">
            Account
          </Text>
          <Pressable
            onPress={handleLogout}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <LogOut size={22} color={BRAND.steel} />
          </Pressable>
        </View>
      </GradientHeader>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-4 pt-6">
          <Card className="overflow-hidden mb-6">
            <Text className="text-sm font-nunito-semibold text-brand-steel leading-normal uppercase tracking-wide px-4 pt-4 pb-2">
              Account
            </Text>

            {user?.email ? (
              <View className="flex-row items-center justify-between px-4 py-3 border-b border-brand-blue/40">
                <Text className="text-base font-nunito text-brand-gray leading-relaxed">
                  Email
                </Text>
                <Text className="text-sm font-nunito text-brand-steel leading-normal">
                  {user.email}
                </Text>
              </View>
            ) : null}

            <View className="flex-row items-center justify-between px-4 py-3 border-b border-brand-blue/40">
              <Text className="text-base font-nunito text-brand-gray leading-relaxed">
                Role
              </Text>
              <Text className="text-sm font-nunito text-brand-steel leading-normal">
                Property Admin
              </Text>
            </View>

            <View className="flex-row items-center justify-between px-4 py-3">
              <Text className="text-base font-nunito text-brand-gray leading-relaxed">
                App Version
              </Text>
              <Text className="text-sm font-nunito text-brand-steel leading-normal">
                {appVersion}
              </Text>
            </View>
          </Card>

          <Card className="overflow-hidden mb-6">
            <Text className="text-sm font-nunito-semibold text-brand-steel leading-normal uppercase tracking-wide px-4 pt-4 pb-2">
              Preferences
            </Text>

            <View className="flex-row justify-between items-center px-4 py-3">
              <Text className="text-base font-nunito text-brand-gray leading-relaxed">
                Push Notifications
              </Text>
              <Switch
                value={permissionGranted}
                onValueChange={(enabled) => {
                  if (enabled) enablePush();
                  else disablePush();
                }}
                trackColor={{ false: '#465A75', true: BRAND.blue }}
                thumbColor={permissionGranted ? '#E0E1DE' : '#7C8DA7'}
              />
            </View>
          </Card>

          <Button onPress={handleLogout} variant="destructive">
            Log Out
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
