import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import {
  Users,
  UserCheck,
  Clock,
  Megaphone,
  ChevronRight,
  Bell,
  Building2,
  LogOut,
} from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { PropertySelector } from '@/components/admin/PropertySelector';
import { StatCard } from '@/components/admin/StatCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/AuthContext';
import { useAdminStats } from '@/hooks/useAdminStats';
import { useAdminRecentActivity } from '@/hooks/useAdminRecentActivity';
import { BRAND } from '@/constants/colors';

export default function AdminDashboard() {
  const { propertyIds, logout } = useAuth();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const activePropertyId = selectedPropertyId ?? '';

  const { data: stats, isLoading: statsLoading } = useAdminStats(activePropertyId);
  const { data: recentActivity, isLoading: activityLoading } = useAdminRecentActivity(activePropertyId);

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
          <Text className="text-2xl font-lora-semibold text-white">Admin Dashboard</Text>
          <Pressable
            onPress={handleLogout}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            className="p-3"
          >
            <LogOut size={22} color={BRAND.gray} />
          </Pressable>
        </View>
        <View className="mt-3">
          <PropertySelector
            propertyIds={propertyIds}
            selected={selectedPropertyId}
            onSelect={setSelectedPropertyId}
          />
        </View>
      </GradientHeader>

      {!activePropertyId ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-base font-nunito text-brand-steel text-center">
            Select a property to view stats
          </Text>
        </View>
      ) : statsLoading ? (
        <LoadingScreen message="Loading dashboard..." />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Stats Grid */}
          <View className="px-4 pt-4 gap-3">
            <View className="flex-row gap-3">
              <StatCard
                label="Total Tenants"
                value={stats?.totalTenants ?? 0}
                icon={Users}
                onPress={() => router.push({ pathname: '/(admin)/tenants', params: { filter: 'all' } })}
              />
              <StatCard
                label="Active"
                value={stats?.activeAccounts ?? 0}
                icon={UserCheck}
                onPress={() => router.push({ pathname: '/(admin)/tenants', params: { filter: 'active' } })}
              />
            </View>
            <View className="flex-row gap-3">
              <StatCard
                label="Pending Invites"
                value={stats?.pendingInvites ?? 0}
                icon={Clock}
                onPress={() => router.push({ pathname: '/(admin)/tenants', params: { filter: 'invited' } })}
              />
              <StatCard
                label="Promotions 30d"
                value={stats?.activePromotions ?? 0}
                icon={Megaphone}
                onPress={() => router.push({ pathname: '/(admin)/advertisers', params: { filter: 'Approved' } })}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View className="px-4 mt-4 gap-3">
            <Card onPress={() => router.push('/(admin)/advertisers')} className="flex-row items-center px-4 py-3.5">
              <Megaphone size={20} color={BRAND.blue} />
              <Text className="flex-1 text-base font-nunito-semibold text-brand-gray ml-3">
                View Pending Approvals
              </Text>
              <ChevronRight size={18} color={BRAND.steel} />
            </Card>

            <Card onPress={() => router.push('/(admin)/tenants')} className="flex-row items-center px-4 py-3.5">
              <Users size={20} color={BRAND.blue} />
              <Text className="flex-1 text-base font-nunito-semibold text-brand-gray ml-3">
                Manage Tenants
              </Text>
              <ChevronRight size={18} color={BRAND.steel} />
            </Card>

            <Card onPress={() => router.push('/(admin)/properties')} className="flex-row items-center px-4 py-3.5">
              <Building2 size={20} color={BRAND.blue} />
              <Text className="flex-1 text-base font-nunito-semibold text-brand-gray ml-3">
                Manage Properties
              </Text>
              <ChevronRight size={18} color={BRAND.steel} />
            </Card>

            <Card onPress={() => router.push('/(admin)/push')} className="flex-row items-center px-4 py-3.5">
              <Bell size={20} color={BRAND.blue} />
              <Text className="flex-1 text-base font-nunito-semibold text-brand-gray ml-3">
                Send Push Notification
              </Text>
              <ChevronRight size={18} color={BRAND.steel} />
            </Card>
          </View>

          {/* Recent Activity */}
          <View className="px-4 mt-6">
            <Text className="text-2xl font-lora-semibold text-white mb-3">Recent Activity</Text>
            {activityLoading ? (
              <View className="items-center py-8">
                <Text className="text-base font-nunito text-brand-steel">Loading activity...</Text>
              </View>
            ) : !recentActivity || recentActivity.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-base font-nunito text-brand-steel">No recent activity</Text>
              </View>
            ) : (
              <View className="gap-2">
                {recentActivity.map((item) => (
                  <Card key={item.id} className="flex-row items-center px-4 py-3">
                    <View className="w-8 h-8 rounded-full bg-brand-blue items-center justify-center mr-3">
                      {item.type === 'tenant' ? (
                        <Users size={16} color="#FFFFFF" />
                      ) : (
                        <Megaphone size={16} color="#FFFFFF" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-nunito-semibold text-brand-gray" numberOfLines={1}>
                        {item.label}
                      </Text>
                      <Text className="text-sm font-nunito text-brand-steel" numberOfLines={1}>
                        {item.sublabel}
                      </Text>
                    </View>
                    <Text className="text-sm font-nunito text-brand-steel ml-2">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </Text>
                  </Card>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
