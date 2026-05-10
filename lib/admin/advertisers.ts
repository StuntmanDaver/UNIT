'use server';

import { revalidatePath } from 'next/cache';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdminAction } from './auth';
import { throwIfError } from './shared';
import type { AdvertiserAccount } from './types';

export async function getAdvertiserAccounts(status?: AdvertiserAccount['status'] | 'all'): Promise<Array<AdvertiserAccount & { promotion_count: number }>> {
  await requireAdminAction();
  const supabase = createServiceRoleClient();
  let query = supabase.from('advertiser_profiles').select('*').order('created_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);
  const { data, error } = await query;
  throwIfError(error);
  const accounts = (data ?? []) as AdvertiserAccount[];
  if (accounts.length === 0) return [];

  const { data: promotions, error: promotionError } = await supabase
    .from('promotions')
    .select('advertiser_id')
    .in('advertiser_id', accounts.map((account) => account.id));
  throwIfError(promotionError);

  const promotionCounts = new Map<string, number>();
  for (const promotion of promotions ?? []) {
    const advertiserId = promotion.advertiser_id as string | null;
    if (!advertiserId) continue;
    promotionCounts.set(advertiserId, (promotionCounts.get(advertiserId) ?? 0) + 1);
  }

  return accounts.map((account) => ({
    ...account,
    promotion_count: promotionCounts.get(account.id) ?? 0,
  }));
}

export async function setAdvertiserStatusAction(
  advertiserId: string,
  status: AdvertiserAccount['status']
): Promise<void> {
  await requireAdminAction();
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('advertiser_profiles').update({ status }).eq('id', advertiserId);
  throwIfError(error);
  revalidatePath('/admin/advertiser-accounts');
}

export async function approveAdvertiserAccountAction(advertiserId: string): Promise<void> {
  return setAdvertiserStatusAction(advertiserId, 'active');
}

export async function suspendAdvertiserAccountAction(advertiserId: string): Promise<void> {
  return setAdvertiserStatusAction(advertiserId, 'suspended');
}

export async function reactivateAdvertiserAccountAction(advertiserId: string): Promise<void> {
  return setAdvertiserStatusAction(advertiserId, 'active');
}
