'use server';

import { revalidatePath } from 'next/cache';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminAuthError, requireAdminAction } from './auth';
import { throwIfError } from './shared';
import type { AdvertiserAccount } from './types';

// Advertiser accounts are GLOBAL entities (no property column), but independent
// landlords must only see/manage advertisers they have a relationship with.
// The relationship is "this advertiser ran a promotion in one of MY properties".
// The portal uses the service-role client (RLS-bypassing), so this scope is
// enforced here in code — the RLS in 20260628000005 is the defense-in-depth
// backstop for any direct (mobile) authenticated access.
async function advertiserIdsLinkedToProperties(
  supabase: ReturnType<typeof createServiceRoleClient>,
  propertyIds: string[]
): Promise<string[]> {
  if (propertyIds.length === 0) return [];
  const { data, error } = await supabase
    .from('promotions')
    .select('advertiser_id')
    .in('property_id', propertyIds);
  throwIfError(error);
  return Array.from(
    new Set(
      (data ?? [])
        .map((row) => row.advertiser_id as string | null)
        .filter((id): id is string => id !== null)
    )
  );
}

export async function getAdvertiserAccounts(status?: AdvertiserAccount['status'] | 'all'): Promise<Array<AdvertiserAccount & { promotion_count: number }>> {
  const context = await requireAdminAction();
  const supabase = createServiceRoleClient();

  const allowedAdvertiserIds = await advertiserIdsLinkedToProperties(supabase, context.propertyIds);
  if (allowedAdvertiserIds.length === 0) return [];

  let query = supabase
    .from('advertiser_profiles')
    .select('*')
    .in('id', allowedAdvertiserIds)
    .order('created_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);
  const { data, error } = await query;
  throwIfError(error);
  const accounts = (data ?? []) as AdvertiserAccount[];
  if (accounts.length === 0) return [];

  // Count only promotions in the admin's own properties, so the displayed count
  // reflects this landlord's relationship, not the advertiser's global activity.
  const { data: promotions, error: promotionError } = await supabase
    .from('promotions')
    .select('advertiser_id')
    .in('advertiser_id', accounts.map((account) => account.id))
    .in('property_id', context.propertyIds);
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
  const context = await requireAdminAction();
  const supabase = createServiceRoleClient();

  // Only a landlord with a property-linked promotion may change this advertiser.
  // NOTE: advertiser_profiles.status is a single GLOBAL field, so the *effect*
  // of a suspend still spans all properties until status is modeled per-property
  // (tracked in docs/security/store-release-hardening-followups.md). This gate
  // restricts WHO can trigger it to a relevant landlord.
  const allowedAdvertiserIds = await advertiserIdsLinkedToProperties(supabase, context.propertyIds);
  if (!allowedAdvertiserIds.includes(advertiserId)) {
    throw new AdminAuthError('You do not manage any property linked to this advertiser', 403);
  }

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
