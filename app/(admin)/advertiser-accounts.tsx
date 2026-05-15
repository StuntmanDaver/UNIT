import { useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ChevronLeft, UserCheck } from 'lucide-react-native';
import { BRAND } from '@/constants/colors';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useAdvertiserAccounts } from '@/hooks/useAdvertiserAccounts';
import {
  advertiserAccountsService,
  type AdvertiserAccountStatus,
  type AdvertiserAccountWithCount,
} from '@/services/advertiserAccounts';
import { firstParam } from '@/lib/routeParams';

const STATUS_SEGMENTS: AdvertiserAccountStatus[] = ['pending', 'active', 'suspended'];
const STATUS_LABELS: Record<AdvertiserAccountStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  suspended: 'Suspended',
};

function isStatus(value: string | undefined): value is AdvertiserAccountStatus {
  return value === 'pending' || value === 'active' || value === 'suspended';
}

function badgeColor(status: AdvertiserAccountStatus): { bg: string; text: string } {
  if (status === 'active') return { bg: '#065F46', text: '#FFFFFF' };
  if (status === 'suspended') return { bg: '#B91C1C', text: '#FFFFFF' };
  return { bg: '#92400E', text: '#FFFFFF' };
}

export default function AdvertiserAccountsScreen() {
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ status?: string }>();
  const initialStatus = firstParam(params.status);
  const [statusFilter, setStatusFilter] = useState<AdvertiserAccountStatus>(
    isStatus(initialStatus) ? initialStatus : 'pending'
  );
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const { data: accounts, isLoading, isError, error, refetch } = useAdvertiserAccounts(statusFilter);

  async function handleAction(
    account: AdvertiserAccountWithCount,
    nextStatus: AdvertiserAccountStatus
  ): Promise<void> {
    setPendingActionId(account.id);
    try {
      await advertiserAccountsService.setStatus(account.id, nextStatus);
      await queryClient.invalidateQueries({ queryKey: ['advertiser-accounts'] });
      Toast.show({ type: 'success', text1: `${account.business_name} ${STATUS_LABELS[nextStatus].toLowerCase()}` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update advertiser';
      Toast.show({ type: 'error', text1: 'Update failed', text2: message });
    } finally {
      setPendingActionId(null);
    }
  }

  const renderItem = ({ item }: { item: AdvertiserAccountWithCount }) => {
    const isWorking = pendingActionId === item.id;
    return (
      <Card className="mx-4 mb-3 p-4">
        <View className="flex-row items-start justify-between gap-3 mb-2">
          <View className="flex-1">
            <Text className="text-base font-nunito-semibold text-brand-ink leading-relaxed" numberOfLines={1}>
              {item.business_name}
            </Text>
            <Text className="text-sm font-nunito text-brand-ink-muted leading-normal mt-0.5" numberOfLines={1}>
              {item.contact_email}
            </Text>
            <Text className="text-sm font-nunito text-brand-ink-muted leading-normal mt-1">
              {item.promotion_count} {item.promotion_count === 1 ? 'promotion' : 'promotions'}
              {item.stripe_customer_id ? ' · Stripe linked' : ' · No Stripe customer'}
            </Text>
          </View>
          <Badge label={STATUS_LABELS[item.status]} color={badgeColor(item.status)} size="sm" />
        </View>

        <View className="flex-row gap-3 mt-3">
          {item.status === 'pending' && (
            <View className="flex-1">
              <Button
                testID={`advertiser-approve-${item.id}`}
                onPress={() => handleAction(item, 'active')}
                loading={isWorking}
                disabled={isWorking}
                variant="primary"
              >
                Approve
              </Button>
            </View>
          )}
          {item.status === 'active' && (
            <View className="flex-1">
              <Button
                testID={`advertiser-suspend-${item.id}`}
                onPress={() => handleAction(item, 'suspended')}
                loading={isWorking}
                disabled={isWorking}
                variant="destructive"
              >
                Suspend
              </Button>
            </View>
          )}
          {item.status === 'suspended' && (
            <View className="flex-1">
              <Button
                testID={`advertiser-reactivate-${item.id}`}
                onPress={() => handleAction(item, 'active')}
                loading={isWorking}
                disabled={isWorking}
                variant="primary"
              >
                Reactivate
              </Button>
            </View>
          )}
        </View>
      </Card>
    );
  };

  return (
    <View className="flex-1 bg-brand-cloud">
      <GradientHeader>
        <Pressable
          testID="back-btn"
          onPress={() => router.push('/(admin)/')}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          className="mb-2 self-start"
        >
          <ChevronLeft size={24} color={BRAND.gray} />
        </Pressable>
        <Text className="text-2xl font-lora-semibold text-white leading-tight">
          Advertiser Approval
        </Text>
        <Text className="text-sm font-nunito text-white leading-normal mt-1">
          Approve advertiser accounts before they can submit promotions
        </Text>
      </GradientHeader>

      <View className="px-4 pt-4">
        <SegmentedControl
          segments={STATUS_SEGMENTS.map((s) => STATUS_LABELS[s])}
          selected={STATUS_LABELS[statusFilter]}
          onChange={(label) => {
            const next = STATUS_SEGMENTS.find((s) => STATUS_LABELS[s] === label);
            if (next) setStatusFilter(next);
          }}
        />
      </View>

      {isLoading ? (
        <LoadingScreen message="Loading advertisers..." />
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base font-nunito text-red-700 leading-relaxed text-center mb-3">
            {error?.message ?? 'Failed to load advertiser accounts'}
          </Text>
          <Button onPress={() => refetch()} variant="secondary">Retry</Button>
        </View>
      ) : (
        <FlatList
          data={accounts ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ flexGrow: 1, paddingTop: 16, paddingBottom: 32 }}
          onRefresh={refetch}
          refreshing={false}
          ListEmptyComponent={
            <EmptyState
              icon={UserCheck}
              title={`No ${STATUS_LABELS[statusFilter].toLowerCase()} advertisers`}
              message={
                statusFilter === 'pending'
                  ? 'New advertisers who sign up on the portal will appear here for approval.'
                  : `No ${STATUS_LABELS[statusFilter].toLowerCase()} advertiser accounts.`
              }
            />
          }
        />
      )}
    </View>
  );
}
