import { useState } from 'react';
import { View, Text, FlatList, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Users, UserCheck, Clock, Megaphone, ChevronRight, Bell } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { PropertySelector } from '@/components/admin/PropertySelector';
import { StatCard } from '@/components/admin/StatCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { PostCard } from '@/components/tenant/PostCard';
import { useAuth } from '@/lib/AuthContext';
import { useAdminStats } from '@/hooks/useAdminStats';
import { usePosts } from '@/hooks/usePosts';
import { useBusinesses } from '@/hooks/useBusinesses';
import { BRAND } from '@/constants/colors';

export default function AdminDashboard() {
  const { propertyIds } = useAuth();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const activePropertyId = selectedPropertyId ?? '';

  const { data: stats, isLoading: statsLoading } = useAdminStats(activePropertyId);
  const { data: posts, isLoading: postsLoading } = usePosts(activePropertyId);
  const { data: businesses } = useBusinesses(activePropertyId);

  const recentPosts = posts?.slice(0, 10) ?? [];
  const businessMap = new Map(businesses?.map((b) => [b.id, b]) ?? []);

  return (
    <View className="flex-1 bg-gray-50">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Admin Dashboard</Text>
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
          <Text className="text-brand-steel text-base text-center">
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
              className="bg-white rounded-xl border border-gray-100 shadow-sm flex-row items-center px-4 py-3.5"
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
              <Megaphone size={20} color={BRAND.blue} />
              <Text className="flex-1 text-base font-semibold text-brand-navy ml-3">
                View Pending Approvals
              </Text>
              <ChevronRight size={18} color={BRAND.steel} />
            </Pressable>
          </View>

          {/* Send Push Notification */}
          <View className="px-4 mt-3">
            <Pressable
              onPress={() => router.push('/(admin)/push')}
              className="bg-blue-50 rounded-xl border border-blue-100 shadow-sm flex-row items-center px-4 py-3.5"
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
              <Bell size={20} color={BRAND.blue} />
              <Text className="flex-1 text-base font-semibold text-brand-navy ml-3">
                Send Push Notification
              </Text>
              <ChevronRight size={18} color={BRAND.steel} />
            </Pressable>
          </View>

          {/* Recent Activity */}
          <View className="px-4 mt-6">
            <Text className="text-lg font-bold text-brand-navy mb-3">Recent Activity</Text>
            {postsLoading ? (
              <View className="items-center py-8">
                <Text className="text-brand-steel">Loading activity...</Text>
              </View>
            ) : recentPosts.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-brand-steel">No recent activity</Text>
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
