'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getActivePromotionPriceTiers as getActivePromotionPriceTiersForClient } from '@/lib/promotions/payments';
import type { PromotionPriceTier } from '@/lib/supabase/types';

export async function getActivePromotionPriceTiers(): Promise<PromotionPriceTier[]> {
  const supabase = createServiceRoleClient();
  return getActivePromotionPriceTiersForClient(supabase);
}
