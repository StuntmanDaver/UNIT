'use server';
import {
  normalizeAdvertiserPromotionFields,
  type AdvertiserPromotionFieldsInput,
} from '@/lib/promotions/fields';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function getProperties() {
  const supabase = createServiceRoleClient();
  const { data } = await supabase.from('properties').select('id, name').order('name');
  return (data ?? []) as { id: string; name: string }[];
}

export async function createPromotion(data: AdvertiserPromotionFieldsInput & {
  propertyId: string;
}) {
  const auth = await createServerSupabaseClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const supabase = createServiceRoleClient();
  const fields = normalizeAdvertiserPromotionFields(data);

  const { data: profile } = await supabase
    .from('advertiser_profiles')
    .select('status, business_name')
    .eq('id', user.id)
    .single();

  if (profile?.status !== 'active') throw new Error('Account is pending approval');

  const { data: promotion, error } = await supabase
    .from('promotions')
    .insert({
      advertiser_id: user.id,
      business_name: profile.business_name,
      property_id: data.propertyId.trim(),
      ...fields,
      review_status: 'draft',
      payment_status: 'unpaid',
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return promotion.id as string;
}
