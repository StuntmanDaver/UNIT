import { useRef, useState } from 'react';
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
import { Share2, LogOut, Megaphone } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Modal } from '@/components/ui/Modal';
import { BusinessCard } from '@/components/tenant/BusinessCard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useProperties } from '@/hooks/useProperties';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/lib/AuthContext';
import { accountService } from '@/services/account';
import { BRAND } from '@/constants/colors';

function TenantProfileContent() {
  const { user, propertyIds, logout } = useAuth();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
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
    } catch {
      Alert.alert('Error', 'Could not share this profile.');
    }
  };

  const handleLogout = () => {
    requestAnimationFrame(() => {
      Alert.alert('Log Out', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: logout },
      ]);
    });
  };

  const confirmDeleteAccount = async () => {
    if (isDeletingAccount) return;

    try {
      setIsDeletingAccount(true);
      await accountService.deleteCurrentAccount();
      setDeleteModalVisible(false);
      await logout();
      Alert.alert('Account Deleted', 'Your UNIT account has been deleted.');
      router.replace('/(auth)/login');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Please try again or contact your property admin.';
      Alert.alert('Could Not Delete Account', message);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <View className="flex-1 bg-brand-cloud">
      <GradientHeader>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-3xl font-lora-semibold text-white leading-tight">Profile</Text>
            {user?.email && (
              <Text className="text-white text-sm font-nunito leading-normal mt-0.5">{user.email}</Text>
            )}
          </View>
          <Pressable
            onPress={handleLogout}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <LogOut size={22} color={BRAND.gray} />
          </Pressable>
        </View>
      </GradientHeader>

      {isLoading ? (
        <LoadingScreen message="Loading profile..." />
      ) : (
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
              <Text className="text-2xl font-lora-semibold text-brand-ink leading-tight mb-2">
                No business profile yet
              </Text>
              <Text className="text-base font-nunito text-brand-ink leading-relaxed">
                Set up your business profile to appear in the directory.
              </Text>
            </Card>
          )}

          {/* Promote My Business CTA — visible only when tenant has a linked business */}
          {business && (
            <Card className="p-5 mb-4">
              <View className="flex-row items-center gap-3 mb-3">
                <Megaphone size={22} color={BRAND.blue} />
                <Text className="text-2xl font-lora-semibold text-brand-ink leading-tight flex-1">
                  Promote My Business
                </Text>
              </View>
              <Text className="text-base font-nunito text-brand-ink leading-relaxed mb-4">
                Reach tenants across your property with a featured promotion.
              </Text>
              <Button onPress={() => router.push('/promotions/create')} variant="primary">
                Get Started
              </Button>
            </Card>
          )}

          {/* QR Code */}
          {business && (
            <Card className="items-center p-6 mb-4">
              <Text className="text-2xl font-lora-semibold text-brand-ink leading-tight mb-4">My QR Code</Text>
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
            <Text className="text-sm font-nunito-semibold text-brand-ink leading-normal uppercase tracking-wide px-4 pt-4 pb-2">
              Settings
            </Text>

            {propertyName ? (
              <View className="flex-row items-center justify-between px-4 py-3 border-b border-brand-blue/40">
                <Text className="text-base font-nunito text-brand-ink leading-relaxed">Property</Text>
                <Text className="text-sm font-nunito text-brand-ink leading-normal">{propertyName}</Text>
              </View>
            ) : null}

            <View className="flex-row items-center justify-between px-4 py-3 border-b border-brand-blue/40">
              <Text className="text-base font-nunito text-brand-ink leading-relaxed">App Version</Text>
              <Text className="text-sm font-nunito text-brand-ink leading-normal">{appVersion}</Text>
            </View>

            <View className="flex-row justify-between items-center px-4 py-3 border-b border-brand-blue/40">
              <Text className="text-base font-nunito text-brand-ink leading-relaxed">Push Notifications</Text>
              <Switch
                testID="profile-push-switch"
                value={permissionGranted}
                onValueChange={(enabled) => {
                  if (enabled) enablePush();
                  else disablePush();
                }}
                trackColor={{ false: '#465A75', true: BRAND.blue }}
                thumbColor={permissionGranted ? '#E0E1DE' : '#5F708A'}
              />
            </View>

            <View className="px-4 py-4">
              <Button
                onPress={() => setDeleteModalVisible(true)}
                variant="destructive"
                loading={isDeletingAccount}
                disabled={isDeletingAccount}
                testID="profile-delete-account"
              >
                Delete Account
              </Button>
            </View>
          </Card>
        </View>
      </ScrollView>
      )}

      {/* Log Out always visible regardless of loading state */}
      <View className="px-4 pb-8">
        <Button onPress={handleLogout} variant="destructive">
          Log Out
        </Button>
      </View>

      <Modal
        visible={deleteModalVisible}
        onClose={() => {
          if (!isDeletingAccount) setDeleteModalVisible(false);
        }}
        title="Delete Account"
        actions={[
          {
            label: 'Cancel',
            variant: 'secondary',
            onPress: () => {
              if (!isDeletingAccount) setDeleteModalVisible(false);
            },
            testID: 'delete-account-cancel',
          },
          {
            label: 'Delete Account',
            variant: 'destructive',
            onPress: confirmDeleteAccount,
            testID: 'delete-account-confirm',
          },
        ]}
      >
        <Text className="text-base font-nunito text-brand-ink leading-relaxed">
          This permanently deletes your UNIT account, profile, business listing, posts,
          promotions, notifications, and related account data. This cannot be undone.
        </Text>
      </Modal>
    </View>
  );
}

export default function ProfileScreen() {
  const { isAdmin } = useAuth();

  // Defense-in-depth: admins should never reach the tenant profile screen
  if (isAdmin) return <Redirect href="/(admin)/" />;

  return <TenantProfileContent />;
}
