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

// Permanently delete the signed-in advertiser's account.
// Required for in-product accounts by Apple/Google store policy.
// 1. Detach advertiser_id from their promotions (keeps records for admin/refund flows).
// 2. Delete advertiser_profiles row (clears PII).
// 3. Delete auth.users entry (revokes all sessions).
// 4. Sign out local cookie session.
// Payment-attempt history is retained for legal compliance.
export async function deleteMyAdvertiserAccount(): Promise<void> {
  const auth = await createServerSupabaseClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const supabase = createServiceRoleClient();

  const { error: detachError } = await supabase
    .from('promotions')
    .update({ advertiser_id: null })
    .eq('advertiser_id', user.id);
  if (detachError) throw new Error(`Could not detach promotions: ${detachError.message}`);

  const { error: profileError } = await supabase
    .from('advertiser_profiles')
    .delete()
    .eq('id', user.id);
  if (profileError) throw new Error(`Could not delete advertiser profile: ${profileError.message}`);

  const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
  if (authError) throw new Error(`Could not delete auth user: ${authError.message}`);

  await auth.auth.signOut();
}
