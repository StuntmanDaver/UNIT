'use server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

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

export async function updatePromotion(id: string, updates: {
  headline: string;
  description?: string;
  startDate: string;
  endDate: string;
}) {
  const auth = await createServerSupabaseClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('promotions')
    .update({
      headline: updates.headline,
      description: updates.description ?? null,
      start_date: updates.startDate,
      end_date: updates.endDate,
    })
    .eq('id', id)
    .eq('advertiser_id', user.id);
  if (error) throw new Error(error.message);
}
