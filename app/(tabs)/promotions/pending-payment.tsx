import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Clock, CheckCircle } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { promotionsService } from '@/services/promotions';
import { promotionPricingService, type PromotionPriceTier } from '@/services/promotionPricing';
import { supabase } from '@/services/supabase';
import { BRAND } from '@/constants/colors';
import { buildAppDeepLink } from '@/constants/runtime';

const RETURN_URL = buildAppDeepLink('promotions');

function formatPrice(cents: number, currency: string): string {
  const amount = (cents / 100).toFixed(2);
  return currency === 'usd' ? `$${amount}` : `${amount} ${currency.toUpperCase()}`;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function PendingPaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: promo, isLoading } = useQuery({
    queryKey: ['promotion', id],
    queryFn: () => promotionsService.getById(id ?? ''),
    enabled: !!id,
  });

  const { data: tiers } = useQuery({
    queryKey: ['promotionPriceTiers', 'active'],
    queryFn: () => promotionPricingService.listTiers(),
    select: (rows) => rows.filter((t) => t.is_active),
  });

  if (isLoading) {
    return <LoadingScreen message="Loading promotion..." />;
  }

  if (!promo) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-cloud">
        <Text className="text-base font-nunito text-brand-ink leading-relaxed">Promotion not found.</Text>
      </View>
    );
  }

  const isPaid = promo.payment_status === 'paid';

  async function handlePayNow() {
    if (!id || !selectedTierId || submitting) return;
    setSubmitting(true);
    try {
      // Lazy import: keeps the screen usable on dev-client binaries that pre-date
      // the expo-web-browser native module. Static import would crash on screen
      // mount; this surfaces the missing-module error only when the user taps Pay.
      let WebBrowser: typeof import('expo-web-browser');
      try {
        WebBrowser = await import('expo-web-browser');
      } catch {
        Toast.show({
          type: 'error',
          text1: 'Checkout unavailable',
          text2: 'This dev build is missing the expo-web-browser native module. Rebuild the dev client.',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke<{ url: string; sessionId: string }>(
        'create-promotion-checkout-session',
        { body: { promotionId: id, priceTierId: selectedTierId } }
      );
      if (error || !data?.url) {
        throw new Error(error?.message ?? 'Could not start checkout. Please try again.');
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, RETURN_URL);

      // Determine outcome from the redirect first. Stripe redirects to
      // success_url (?status=success) on completed payment and cancel_url
      // (?status=cancel) on user cancel. result.type === 'success' means the
      // browser reached one of those URLs; we look at the query param.
      // result.type === 'cancel' / 'dismiss' means the user closed the browser
      // without redirect → not paid.
      let userReachedSuccessUrl = false;
      if (result.type === 'success' && result.url) {
        try {
          const status = new URL(result.url).searchParams.get('status');
          userReachedSuccessUrl = status === 'success';
        } catch {
          // Malformed URL — fall through to DB poll.
        }
      }

      // Confirm with the Edge Function as a fallback to the portal webhook.
      // This keeps the mobile return path correct when the webhook is delayed
      // or unavailable in local/staging E2E.
      if (userReachedSuccessUrl && data.sessionId) {
        const { data: confirmData, error: confirmError } = await supabase.functions.invoke<{
          paid: boolean;
          paymentStatus?: 'paid';
          reviewStatus?: 'pending';
        }>(
          'create-promotion-checkout-session',
          { body: { action: 'confirm', promotionId: id, sessionId: data.sessionId } }
        );
        if (confirmError) {
          console.warn('[pending-payment] checkout confirmation fallback failed:', confirmError.message);
        } else if (confirmData?.paid) {
          queryClient.setQueryData(['promotion', id], (existing: typeof promo | undefined) => {
            if (!existing) return existing;
            return {
              ...existing,
              payment_status: 'paid',
              review_status: 'pending',
            };
          });
        }
      }

      // Poll the promotion row briefly. The webhook may not have flipped
      // payment_status='paid' yet when Stripe redirects back, and a single
      // immediate refetch leaves this screen visually stuck in Pending Payment
      // even though the DB flips seconds later.
      let refreshed = await queryClient.fetchQuery({
        queryKey: ['promotion', id],
        queryFn: () => promotionsService.getById(id),
      });
      for (let attempt = 0; attempt < 8 && userReachedSuccessUrl && refreshed.payment_status !== 'paid'; attempt += 1) {
        await wait(1000);
        refreshed = await queryClient.fetchQuery({
          queryKey: ['promotion', id],
          queryFn: () => promotionsService.getById(id),
        });
      }

      if (refreshed.payment_status === 'paid') {
        Toast.show({ type: 'success', text1: 'Payment received', text2: 'Submitted for admin review.' });
      } else if (userReachedSuccessUrl) {
        // Stripe redirected successfully but webhook hasn't landed within the poll window.
        // Do NOT write optimistic state — the webhook will update the DB.
        Toast.show({ type: 'info', text1: 'Payment processing…', text2: 'Check back in a moment — your submission will appear shortly.' });
      } else {
        Toast.show({ type: 'error', text1: 'Payment was not completed.' });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout failed.';
      Toast.show({ type: 'error', text1: 'Checkout error', text2: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-brand-cloud">
      <GradientHeader>
        <Text className="text-3xl font-lora-semibold text-white leading-tight">
          {isPaid ? 'Awaiting Review' : 'Promotion Created'}
        </Text>
      </GradientHeader>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 }}>
        <View className="flex-row items-center gap-3 bg-brand-mist border border-brand-blue/40 rounded-2xl p-4 mb-6">
          {isPaid ? (
            <CheckCircle size={24} color={BRAND.blue} />
          ) : (
            <Clock size={24} color={BRAND.steel} />
          )}
          <View className="flex-1">
            <Text className="text-base font-nunito-semibold text-brand-ink leading-relaxed">
              {isPaid ? 'Awaiting Review' : 'Pending Payment'}
            </Text>
            <Text className="text-sm font-nunito text-brand-ink-muted leading-normal mt-0.5">
              {isPaid
                ? 'Payment received. Admins will review your promotion shortly.'
                : 'Complete payment to submit your promotion for admin review.'}
            </Text>
          </View>
        </View>

        <Card className="p-5 mb-6">
          <Text className="text-sm font-nunito-semibold text-brand-ink-muted leading-normal uppercase tracking-wide mb-3">
            Your Promotion
          </Text>
          <Text className="text-2xl font-lora-semibold text-brand-ink leading-tight mb-2">
            {promo.headline}
          </Text>
          {promo.description && (
            <Text className="text-base font-nunito text-brand-ink leading-relaxed mb-3">
              {promo.description}
            </Text>
          )}
          {(promo.start_date || promo.end_date) && (
            <Text className="text-sm font-nunito text-brand-ink-muted leading-normal">
              {promo.start_date && `From ${promo.start_date}`}
              {promo.start_date && promo.end_date && ' · '}
              {promo.end_date && `Until ${promo.end_date}`}
            </Text>
          )}
        </Card>

        {!isPaid && (
          <View className="mb-6">
            <Text
              accessibilityRole="header"
              className="text-sm font-nunito-semibold text-brand-ink-muted leading-normal uppercase tracking-wide mb-3"
            >
              Choose a tier
            </Text>
            <View
              className="gap-3"
              accessibilityRole="radiogroup"
              accessibilityLabel="Promotion price tier"
            >
              {(tiers ?? []).map((tier: PromotionPriceTier, index: number) => {
                const selected = tier.id === selectedTierId;
                return (
                  <Pressable
                    key={tier.id}
                    onPress={() => setSelectedTierId(tier.id)}
                    testID={`promotion-tier-${index}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${tier.name}${tier.is_featured ? ' Featured' : ''}, ${tier.duration_days} days, ${formatPrice(tier.price_cents, tier.currency)}`}
                    className={`rounded-2xl p-4 border ${
                      selected
                        ? 'border-brand-blue bg-brand-mist'
                        : 'border-brand-blue/40 bg-brand-mist'
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 pr-4">
                        <Text className="text-base font-nunito-semibold text-brand-ink leading-relaxed">
                          {tier.name}
                          {tier.is_featured ? ' · Featured' : ''}
                        </Text>
                        <Text className="text-sm font-nunito text-brand-ink-muted leading-normal mt-0.5">
                          {tier.duration_days} days
                        </Text>
                      </View>
                      <Text className="text-base font-nunito-semibold text-brand-ink leading-relaxed">
                        {formatPrice(tier.price_cents, tier.currency)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
              {(tiers?.length ?? 0) === 0 && (
                <Text className="text-sm font-nunito text-brand-ink-muted leading-normal">
                  No tiers available. Contact your property admin.
                </Text>
              )}
            </View>
          </View>
        )}

        <View className="gap-3">
          {!isPaid && (
            <Button
              onPress={handlePayNow}
              disabled={!selectedTierId || submitting || (tiers?.length ?? 0) === 0}
              loading={submitting}
              testID="pending-payment-pay-now"
            >
              Pay Now
            </Button>
          )}
          <Button onPress={() => router.replace('/(tabs)/promotions')} variant="ghost" testID="pending-payment-save-later">
            {isPaid ? 'Back to Promotions' : 'Save for Later'}
          </Button>
        </View>

        {!isPaid && (
          <Text className="text-sm font-nunito text-brand-ink-muted leading-normal text-center mt-6">
            Your promotion is saved as a draft. You can return to complete payment anytime from the Promotions tab.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
