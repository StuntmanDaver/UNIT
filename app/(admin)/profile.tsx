import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Switch,
} from 'react-native';
import { useState } from 'react';
import { router, Redirect } from 'expo-router';
import Constants from 'expo-constants';
import { ChevronLeft, LogOut } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/lib/AuthContext';
import { accountService } from '@/services/account';
import { BRAND } from '@/constants/colors';

export default function AdminProfileScreen() {
  const { user, logout, isAdmin } = useAuth();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Defense-in-depth: only landlords should reach this screen
  if (!isAdmin) return <Redirect href="/(tabs)/directory" />;
  const { permissionGranted, enablePush, disablePush } = usePushNotifications();

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
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
          : 'Please try again or contact support.';
      Alert.alert('Could Not Delete Account', message);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <View className="flex-1 bg-brand-navy">
      <GradientHeader>
        <View className="flex-row items-center justify-between">
          <Pressable
            testID="back-btn"
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

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
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

          <Card className="overflow-hidden mb-6">
            <Text className="text-sm font-nunito-semibold text-brand-ink-muted leading-normal uppercase tracking-wide px-4 pt-4 pb-2">
              Account Deletion
            </Text>
            <View className="px-4 py-4">
              <Button
                onPress={() => setDeleteModalVisible(true)}
                variant="destructive"
                loading={isDeletingAccount}
                disabled={isDeletingAccount}
                testID="admin-delete-account"
              >
                Delete Account
              </Button>
            </View>
          </Card>
        </View>
      </ScrollView>

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
          This permanently deletes your UNIT account and personal account data. Property
          records and promotions you reviewed will remain available to the property
          without your account attached. This cannot be undone.
        </Text>
      </Modal>
    </View>
  );
}
