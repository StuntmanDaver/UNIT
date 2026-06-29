'use server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// The advertiser profile id is derived from the authenticated session, never
// from a client argument — otherwise an unauthenticated caller could create
// pending advertiser profiles for arbitrary user ids.
export async function createAdvertiserProfile(businessName: string, email: string) {
  const auth = await createServerSupabaseClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('advertiser_profiles')
    .insert({
      id: user.id,
      business_name: businessName,
      contact_email: user.email ?? email,
      status: 'pending',
    });
  return { error: error?.message ?? null };
}
