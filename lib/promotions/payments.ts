import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PaymentStatus,
  PromotionPaymentAttemptType,
  PromotionPriceTier,
  ReviewStatus,
} from '@/lib/supabase/types';

const PRICE_TIER_COLUMNS = 'id, name, duration_days, is_featured, price_cents, currency, is_active';
type PromotionPriceTierClient = Pick<SupabaseClient, 'from'>;

export type PromotionPaymentState = {
  review_status: ReviewStatus;
  payment_status: PaymentStatus;
};

export function derivePromotionPaymentAttemptType(
  promotion: PromotionPaymentState
): PromotionPaymentAttemptType | null {
  if (promotion.review_status === 'draft' && promotion.payment_status === 'unpaid') {
    return 'initial';
  }

  if (
    promotion.review_status === 'revision_requested' &&
    promotion.payment_status === 'repayment_required'
  ) {
    return 'repayment';
  }

  return null;
}

export function canPayForPromotion(promotion: PromotionPaymentState): boolean {
  return derivePromotionPaymentAttemptType(promotion) !== null;
}

export async function getActivePromotionPriceTiers(
  supabase: PromotionPriceTierClient
): Promise<PromotionPriceTier[]> {
  const { data, error } = await supabase
    .from('promotion_price_tiers')
    .select(PRICE_TIER_COLUMNS)
    .eq('is_active', true)
    .order('price_cents', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getActivePromotionPriceTier(
  supabase: PromotionPriceTierClient,
  priceTierId: string
): Promise<PromotionPriceTier | null> {
  const { data, error } = await supabase
    .from('promotion_price_tiers')
    .select(PRICE_TIER_COLUMNS)
    .eq('id', priceTierId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
