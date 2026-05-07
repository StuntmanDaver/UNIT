'use server';
import { normalizeAdvertiserPromotionFields } from '@/lib/promotions/fields';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { AdvertiserPromotionFieldsInput } from '@/lib/promotions/fields';

export async function getPromotion(id: string) {
  const auth = await createServerSupabaseClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('promotions')
    .select('*')
    .eq('id', id)
    .eq('advertiser_id', user.id)
    .single();
  return data;
}

export async function getPaymentAttempt(sessionId: string) {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('promotion_payment_attempts')
    .select('promotion_id, status')
    .eq('stripe_checkout_session_id', sessionId)
    .single();
  return data;
}

export async function updatePromotion(id: string, updates: AdvertiserPromotionFieldsInput) {
  const auth = await createServerSupabaseClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const supabase = createServiceRoleClient();

  const { data: promotion, error: fetchError } = await supabase
    .from('promotions')
    .select('id, review_status')
    .eq('id', id)
    .eq('advertiser_id', user.id)
    .single();

  if (fetchError || !promotion) throw new Error('Promotion not found');
  if (!['draft', 'revision_requested'].includes(promotion.review_status)) {
    throw new Error('Promotion cannot be edited');
  }

  const fields = normalizeAdvertiserPromotionFields(updates);
  const { error } = await supabase
    .from('promotions')
    .update(fields)
    .eq('id', id)
    .eq('advertiser_id', user.id);
  if (error) throw new Error(error.message);
}
