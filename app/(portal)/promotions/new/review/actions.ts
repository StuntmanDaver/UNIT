'use server';

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getActivePromotionPriceTiers as getActivePromotionPriceTiersForClient } from '@/lib/promotions/payments';
import type { PromotionPriceTier } from '@/lib/supabase/types';

export async function getActivePromotionPriceTiers(): Promise<PromotionPriceTier[]> {
  const auth = await createServerSupabaseClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return [];

  const supabase = createServiceRoleClient();
  return getActivePromotionPriceTiersForClient(supabase);
}
