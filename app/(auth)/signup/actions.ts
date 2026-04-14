'use server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function createAdvertiserProfile(userId: string, businessName: string, email: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('advertiser_profiles')
    .insert({ id: userId, business_name: businessName, contact_email: email, status: 'pending' });
  return { error: error?.message ?? null };
}
