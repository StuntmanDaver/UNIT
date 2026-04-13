import { useState } from 'react';
import { View, Text, FlatList, Pressable, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Users, UserCheck, Clock, Megaphone, ChevronRight, Bell, LogOut } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { PropertySelector } from '@/components/admin/PropertySelector';
import { StatCard } from '@/components/admin/StatCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { PostCard } from '@/components/tenant/PostCard';
import { useAuth } from '@/lib/AuthContext';
import { useAdminStats } from '@/hooks/useAdminStats';
import { usePosts } from '@/hooks/usePosts';
import { useBusinesses } from '@/hooks/useBusinesses';
import { RevenueChart } from '@/components/admin/RevenueChart';
import { AdEngagementStats } from '@/components/admin/AdEngagementStats';
import { useMonthlyRevenue, useMonthlyEngagement } from '@/hooks/usePromotionStats';
import { BRAND } from '@/constants/colors';

export default function AdminDashboard() {
  const { propertyIds, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const activePropertyId = selectedPropertyId ?? '';

  const { data: stats, isLoading: statsLoading } = useAdminStats(activePropertyId);
  const { data: posts, isLoading: postsLoading } = usePosts(activePropertyId);
  const { data: businesses } = useBusinesses(activePropertyId);
  const { data: revenueData = [] } = useMonthlyRevenue(activePropertyId);
  const { data: engagementData } = useMonthlyEngagement(activePropertyId);

  const recentPosts = posts?.slice(0, 10) ?? [];
  const businessMap = new Map(businesses?.map((b) => [b.id, b]) ?? []);

  return (
    <View className="flex-1 bg-brand-navy">
      <GradientHeader>
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-lora-semibold text-white leading-tight">Admin Dashboard</Text>
          <Pressable
            onPress={handleLogout}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <LogOut size={22} color={BRAND.steel} />
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
              />
              <StatCard
                label="Active"
                value={stats?.activeAccounts ?? 0}
                icon={UserCheck}
              />
            </View>
            <View className="flex-row gap-3">
              <StatCard
                label="Pending Invites"
                value={stats?.pendingInvites ?? 0}
                icon={Clock}
              />
              <StatCard
                label="Promotions 30d"
                value={stats?.activePromotions ?? 0}
                icon={Megaphone}
              />
            </View>
          </View>

          {/* View Pending Approvals */}
          <View className="px-4 mt-4">
            <Pressable
              onPress={() => router.push('/(admin)/advertisers')}
              className="bg-brand-navy-light rounded-xl border border-brand-blue/40 shadow-sm flex-row items-center px-4 py-3.5"
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
              <Megaphone size={20} color={BRAND.blue} />
              <Text className="flex-1 text-base font-nunito-semibold text-white ml-3">
                View Pending Approvals
              </Text>
              <ChevronRight size={18} color={BRAND.steel} />
            </Pressable>
          </View>

          {/* Send Push Notification */}
          <View className="px-4 mt-3">
            <Pressable
              onPress={() => router.push('/(admin)/push')}
              className="bg-brand-navy-light rounded-xl border border-brand-blue/40 shadow-sm flex-row items-center px-4 py-3.5"
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
              <Bell size={20} color={BRAND.blue} />
              <Text className="flex-1 text-base font-nunito-semibold text-white ml-3">
                Send Push Notification
              </Text>
              <ChevronRight size={18} color={BRAND.steel} />
            </Pressable>
          </View>

          {/* Revenue Section */}
          {activePropertyId && (
            <View className="px-4 mt-4">
              <Text className="text-base font-nunito-semibold text-brand-gray mb-2">Ad Revenue</Text>
              <View className="bg-brand-navy-light rounded-xl p-4 shadow-sm border border-brand-blue/40">
                {revenueData.length > 0 && (
                  <View className="flex-row justify-between mb-3">
                    <View>
                      <Text className="text-sm font-nunito text-brand-gray">This month gross</Text>
                      <Text className="text-2xl font-lora-semibold text-white leading-tight">
                        ${(revenueData[revenueData.length - 1]?.gross ?? 0).toFixed(2)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-sm font-nunito text-brand-gray">This month net</Text>
                      <Text className="text-2xl font-lora-semibold text-green-400 leading-tight">
                        ${(revenueData[revenueData.length - 1]?.net ?? 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}
                <RevenueChart data={revenueData} />
              </View>
            </View>
          )}

          {/* Ad Engagement Section */}
          {activePropertyId && engagementData && (
            <View className="px-4 mt-4">
              <Text className="text-base font-nunito-semibold text-brand-gray mb-2">Ad Engagement</Text>
              <AdEngagementStats data={engagementData} />
            </View>
          )}

          {/* Recent Activity */}
          <View className="px-4 mt-6">
            <Text className="text-2xl font-lora-semibold text-white leading-tight mb-3">Recent Activity</Text>
            {postsLoading ? (
              <View className="items-center py-8">
                <Text className="text-base font-nunito text-brand-steel">Loading activity...</Text>
              </View>
            ) : recentPosts.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-base font-nunito text-brand-steel">No recent activity</Text>
              </View>
            ) : (
              <View className="gap-3">
                {recentPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    authorBusiness={businessMap.get(post.business_id)}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
