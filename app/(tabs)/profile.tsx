import { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import QRCode from 'react-native-qrcode-svg';
import Constants from 'expo-constants';
import { Edit2, Share2 } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { BusinessCard } from '@/components/tenant/BusinessCard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useProperties } from '@/hooks/useProperties';
import { useAuth } from '@/lib/AuthContext';

export default function ProfileScreen() {
  const { user, propertyIds, logout } = useAuth();
  const { data: business, isLoading } = useCurrentUser();
  const { data: properties } = useProperties(propertyIds);
  const svgRef = useRef<unknown>(null);

  const propertyName = properties?.[0]?.name ?? '';
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const qrValue = business ? `unit://directory/${business.id}` : 'unit://profile';

  const handleShare = async () => {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('Sharing not available', 'Sharing is not supported on this device.');
      return;
    }
    await Sharing.shareAsync(qrValue);
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
    <View className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Profile</Text>
        {user?.email && (
          <Text className="text-brand-steel text-sm mt-0.5">{user.email}</Text>
        )}
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
            <View className="bg-gray-50 rounded-2xl p-5 mb-4">
              <Text className="text-brand-navy font-semibold text-base mb-1">
                No business profile yet
              </Text>
              <Text className="text-brand-steel text-sm">
                Set up your business profile to appear in the directory.
              </Text>
            </View>
          )}

          {/* QR Code */}
          {business && (
            <View className="items-center bg-gray-50 rounded-2xl p-6 mb-4">
              <Text className="text-base font-semibold text-brand-navy mb-4">My QR Code</Text>
              <QRCode
                value={qrValue}
                size={150}
                getRef={(ref) => { svgRef.current = ref; }}
              />
              <Pressable
                onPress={handleShare}
                className="mt-4 flex-row items-center gap-2 bg-brand-navy rounded-xl px-5 py-2.5"
              >
                <Share2 size={16} color="#FFFFFF" />
                <Text className="text-white text-sm font-semibold">Share</Text>
              </Pressable>
            </View>
          )}

          {/* Settings section */}
          <View className="bg-gray-50 rounded-2xl overflow-hidden mb-6">
            <Text className="text-xs font-semibold text-brand-steel uppercase tracking-wide px-4 pt-4 pb-2">
              Settings
            </Text>

            {propertyName ? (
              <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
                <Text className="text-sm text-brand-navy font-medium">Property</Text>
                <Text className="text-sm text-brand-steel">{propertyName}</Text>
              </View>
            ) : null}

            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
              <Text className="text-sm text-brand-navy font-medium">App Version</Text>
              <Text className="text-sm text-brand-steel">{appVersion}</Text>
            </View>
          </View>

          {/* Log Out */}
          <Button onPress={handleLogout} variant="destructive">
            Log Out
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
