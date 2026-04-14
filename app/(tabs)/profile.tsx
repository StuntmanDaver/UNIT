import { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Switch,
  Share,
} from 'react-native';
import { router, Redirect } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import Constants from 'expo-constants';
import { Edit2, Share2, LogOut } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { BusinessCard } from '@/components/tenant/BusinessCard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useProperties } from '@/hooks/useProperties';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/lib/AuthContext';
import { BRAND } from '@/constants/colors';

export default function ProfileScreen() {
  const { user, propertyIds, logout, isAdmin } = useAuth();

  // Defense-in-depth: admins should never reach the tenant profile screen
  if (isAdmin) return <Redirect href="/(admin)/" />;
  const { data: business, isLoading } = useCurrentUser();
  const { data: properties } = useProperties(propertyIds);
  const { permissionGranted, enablePush, disablePush } = usePushNotifications();
  const svgRef = useRef<unknown>(null);

  const propertyName = properties?.[0]?.name ?? '';
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const qrValue = business ? `unit://directory/${business.id}` : 'unit://profile';

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Connect with my business on UNIT! ${qrValue}`,
        url: qrValue,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share this profile.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  if (isLoading) {
    return <LoadingScreen message="Loading profile..." />;
  }

  return (
    <View className="flex-1 bg-brand-navy">
      <GradientHeader>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-3xl font-lora-semibold text-white leading-tight">Profile</Text>
            {user?.email && (
              <Text className="text-brand-steel text-sm font-nunito leading-normal mt-0.5">{user.email}</Text>
            )}
          </View>
          <Pressable
            onPress={handleLogout}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <LogOut size={22} color="#7C8DA7" />
          </Pressable>
        </View>
      </GradientHeader>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-4 pt-6">
          {/* Business card */}
          {business ? (
            <View className="mb-4">
              <BusinessCard business={business} />
              <View className="mt-3">
                <Button onPress={() => router.push('/profile/edit')} variant="secondary">
                  Edit Profile
                </Button>
              </View>
            </View>
          ) : (
            <Card className="p-6 mb-4">
              <Text className="text-2xl font-lora-semibold text-brand-gray leading-tight mb-2">
                No business profile yet
              </Text>
              <Text className="text-base font-nunito text-brand-gray leading-relaxed">
                Set up your business profile to appear in the directory.
              </Text>
            </Card>
          )}

          {/* QR Code */}
          {business && (
            <Card className="items-center p-6 mb-4">
              <Text className="text-2xl font-lora-semibold text-brand-gray leading-tight mb-4">My QR Code</Text>
              <QRCode
                value={qrValue}
                size={150}
                getRef={(ref) => { svgRef.current = ref; }}
              />
              <Pressable
                onPress={handleShare}
                className="mt-4 flex-row items-center gap-2 bg-brand-blue rounded-xl px-5 py-3"
              >
                <Share2 size={16} color="#FFFFFF" />
                <Text className="text-base font-nunito-semibold text-white">Share</Text>
              </Pressable>
            </Card>
          )}

          {/* Settings section */}
          <Card className="overflow-hidden mb-6">
            <Text className="text-sm font-nunito-semibold text-brand-steel leading-normal uppercase tracking-wide px-4 pt-4 pb-2">
              Settings
            </Text>

            {propertyName ? (
              <View className="flex-row items-center justify-between px-4 py-3 border-b border-brand-blue/40">
                <Text className="text-base font-nunito text-brand-gray leading-relaxed">Property</Text>
                <Text className="text-sm font-nunito text-brand-steel leading-normal">{propertyName}</Text>
              </View>
            ) : null}

            <View className="flex-row items-center justify-between px-4 py-3 border-b border-brand-blue/40">
              <Text className="text-base font-nunito text-brand-gray leading-relaxed">App Version</Text>
              <Text className="text-sm font-nunito text-brand-steel leading-normal">{appVersion}</Text>
            </View>

            <View className="flex-row justify-between items-center px-4 py-3">
              <Text className="text-base font-nunito text-brand-gray leading-relaxed">Push Notifications</Text>
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

          {/* Log Out */}
          <Button onPress={handleLogout} variant="destructive">
            Log Out
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
