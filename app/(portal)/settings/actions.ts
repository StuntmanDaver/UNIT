'use server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function getMyProfile() {
  const auth = await createServerSupabaseClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  const supabase = createServiceRoleClient();
  const { data } = await supabase.from('advertiser_profiles').select('*').eq('id', user.id).single();
  return data;
}

export async function updateMyProfile(businessName: string, contactEmail: string) {
  const auth = await createServerSupabaseClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('advertiser_profiles')
    .update({ business_name: businessName, contact_email: contactEmail })
    .eq('id', user.id);
  if (error) throw new Error(error.message);
}
