'use server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function getProperties() {
  const supabase = createServiceRoleClient();
  const { data } = await supabase.from('properties').select('id, name').order('name');
  return (data ?? []) as { id: string; name: string }[];
}

export async function createPromotion(data: {
  propertyId: string;
  headline: string;
  description?: string;
  startDate: string;
  endDate: string;
}) {
  const auth = await createServerSupabaseClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const supabase = createServiceRoleClient();

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
      property_id: data.propertyId,
      headline: data.headline,
      description: data.description ?? null,
      start_date: data.startDate,
      end_date: data.endDate,
      review_status: 'draft',
      payment_status: 'unpaid',
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return promotion.id as string;
}
