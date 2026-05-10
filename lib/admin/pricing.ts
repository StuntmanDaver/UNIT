'use server';

import { revalidatePath } from 'next/cache';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdminAction } from './auth';
import { throwIfError } from './shared';
import type { AdminPromotionPriceTier } from './types';

type PriceTierInput = {
  id?: string;
  name: string;
  durationDays: number;
  priceCents: number;
  isFeatured: boolean;
  isActive: boolean;
};

export async function getPricingTiers(): Promise<AdminPromotionPriceTier[]> {
  await requireAdminAction();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('promotion_price_tiers')
    .select('*')
    .order('price_cents', { ascending: true });
  throwIfError(error);
  return (data ?? []) as AdminPromotionPriceTier[];
}

export async function upsertPricingTierAction(input: PriceTierInput): Promise<void> {
  await requireAdminAction();
  const payload = {
    name: input.name.trim(),
    duration_days: input.durationDays,
    price_cents: input.priceCents,
    currency: 'usd',
    is_featured: input.isFeatured,
    is_active: input.isActive,
  };
  const supabase = createServiceRoleClient();
  const result = input.id
    ? await supabase.from('promotion_price_tiers').update(payload).eq('id', input.id)
    : await supabase.from('promotion_price_tiers').insert(payload);
  throwIfError(result.error);
  revalidatePath('/admin/pricing');
}

export async function deactivatePricingTierAction(id: string): Promise<void> {
  await requireAdminAction();
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('promotion_price_tiers').update({ is_active: false }).eq('id', id);
  throwIfError(error);
  revalidatePath('/admin/pricing');
}
