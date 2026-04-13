// app/(admin)/promotions/[id].tsx
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { BRAND } from '@/constants/colors';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Button } from '@/components/ui/Button';
import { PromotionReviewActions } from '@/components/admin/PromotionReviewActions';
import { useAdminPromotion } from '@/hooks/useAdminPromotions';
import { promotionsService, type AdminPromotionReviewAction } from '@/services/promotions';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/services/supabase';

/** Render a small inline status pill for any status string */
function StatusPill({ label }: { label: string }) {
  const display = label
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return (
    <View className="bg-brand-blue/40 rounded-full px-3 py-1">
      <Text className="text-sm font-nunito-semibold text-white">{display}</Text>
    </View>
  );
}

export default function AdminPromotionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [anomaly, setAnomaly] = useState<boolean | null>(null);

  const { data: promotion, isLoading } = useAdminPromotion(id);

  useEffect(() => {
    if (promotion?.payment_status === 'paid') {
      promotionsService.hasCompletedPaymentAttempt(id).then((has) => setAnomaly(!has));
    }
  }, [id, promotion?.payment_status]);

  if (isLoading || !promotion) return <LoadingScreen message="Loading promotion..." />;

  const canReview = promotion.review_status === 'pending';
  const canSuspendReinstate =
    promotion.review_status === 'approved' || promotion.review_status === 'suspended';
  const canRefund =
    promotion.review_status === 'rejected' &&
    (promotion.payment_status === 'paid' || promotion.payment_status === 'repayment_required');

  const handleReviewAction = async (action: AdminPromotionReviewAction) => {
    if (!user) return;
    setActionLoading(true);
    try {
      await promotionsService.applyReviewAction(id, user.id, promotion, action);
      await queryClient.invalidateQueries({ queryKey: ['admin-promotion', id] });
      await queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      Toast.show({ type: 'success', text1: 'Action applied' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to apply action' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSuspend = async () => {
    if (!user || !canSuspendReinstate) return;
    setActionLoading(true);
    try {
      await promotionsService.toggleSuspend(
        id,
        user.id,
        promotion.review_status as 'approved' | 'suspended'
      );
      await queryClient.invalidateQueries({ queryKey: ['admin-promotion', id] });
      Toast.show({ type: 'success', text1: 'Status updated' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to update status' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = () => {
    Alert.prompt(
      'Issue Refund',
      'Enter a reason for the refund (shown to the advertiser):',
      async (reason) => {
        if (!reason?.trim()) return;
        setRefundLoading(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const response = await fetch(
            `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/issue-refund`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify({ promotionId: id, reason: reason.trim() }),
            }
          );
          if (!response.ok) {
            const body = await response.json();
            throw new Error(body.error ?? 'Refund failed');
          }
          await queryClient.invalidateQueries({ queryKey: ['admin-promotion', id] });
          Toast.show({ type: 'success', text1: 'Refund issued' });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Refund failed';
          Toast.show({ type: 'error', text1: msg });
        } finally {
          setRefundLoading(false);
        }
      },
      'plain-text'
    );
  };

  return (
    <View className="flex-1 bg-brand-navy">
      <GradientHeader>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          className="mb-2 self-start"
        >
          <ChevronLeft size={24} color={BRAND.gray} />
        </Pressable>
        <Text className="text-2xl font-lora-semibold text-white">{promotion.headline}</Text>
        <View className="flex-row gap-2 mt-2">
          <StatusPill label={promotion.review_status} />
          {promotion.payment_status && (
            <StatusPill label={promotion.payment_status} />
          )}
        </View>
      </GradientHeader>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {anomaly === true && (
          <View className="bg-yellow-500/20 border border-yellow-500/60 rounded-xl p-4 mb-4">
            <Text className="text-sm font-nunito-semibold text-yellow-300">
              ⚠ No completed payment record found — verify before approving.
            </Text>
          </View>
        )}

        {promotion.review_note && (
          <View className="bg-brand-navy-light border border-brand-blue/40 rounded-xl p-4 mb-4">
            <Text className="text-sm font-nunito-semibold text-brand-gray mb-1">Admin note</Text>
            <Text className="text-sm font-nunito text-brand-gray">{promotion.review_note}</Text>
          </View>
        )}

        <View className="bg-brand-navy-light rounded-xl p-4 border border-brand-blue/40 shadow-sm mb-4">
          <Text className="text-base font-nunito-semibold text-white mb-1">
            {promotion.business_name}
          </Text>
          {promotion.description && (
            <Text className="text-sm font-nunito text-brand-gray mb-2">{promotion.description}</Text>
          )}
          <Text className="text-sm font-nunito text-brand-gray">
            {promotion.start_date} → {promotion.end_date}
          </Text>
        </View>

        {canReview && (
          <View className="mb-4">
            <Text className="text-sm font-nunito-semibold text-brand-gray mb-2">Review Actions</Text>
            <PromotionReviewActions onAction={handleReviewAction} loading={actionLoading} />
          </View>
        )}

        {canSuspendReinstate && (
          <Button
            onPress={handleToggleSuspend}
            disabled={actionLoading}
            variant={promotion.review_status === 'approved' ? 'secondary' : 'primary'}
          >
            {promotion.review_status === 'approved' ? 'Suspend' : 'Reinstate'}
          </Button>
        )}

        {canRefund && (
          <Button
            onPress={handleRefund}
            disabled={refundLoading}
            variant="destructive"
            className="mt-3"
          >
            Issue Refund
          </Button>
        )}
      </ScrollView>
    </View>
  );
}
