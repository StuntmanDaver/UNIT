'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { assertAdminPropertyAccess, requireAdminAction } from './auth';
import { normalizePropertyIds } from './permissions';
import type {
  AdvertiserAccount,
  AdminActivity,
  AdminBusiness,
  AdminDashboardData,
  AdminNotification,
  AdminProfile,
  AdminPromotion,
  AdminPromotionPriceTier,
  AdminPromotionReviewAction,
  AdminProperty,
  AdminStats,
  AdminTenant,
  TenantImportInput,
  TenantImportResult,
} from './types';

type SupabaseError = { message: string };

type PropertyInput = {
  name: string;
  address: string;
  city: string;
  state: string;
  type?: string;
  totalUnits?: number;
};

type ExternalPromotionInput = {
  propertyId: string;
  businessName: string;
  headline: string;
  description: string;
  imageUrl: string | null;
  ctaText: string;
  ctaLink: string;
  externalContactName: string | null;
  externalContactEmail: string | null;
  externalContactPhone: string | null;
  startDate: string;
  endDate: string;
};

type PriceTierInput = {
  id?: string;
  name: string;
  durationDays: number;
  priceCents: number;
  isFeatured: boolean;
  isActive: boolean;
};

type PushBroadcastInput = {
  propertyId: string;
  title: string;
  message: string;
  audience: 'all' | 'active';
};

type PromotionReviewActionInput =
  | { promotionId: string; action: 'approve' }
  | { promotionId: string; action: 'allow_revision' | 'require_repayment' | 'reject'; note: string };

type PromotionSuspensionInput = {
  promotionId: string;
};

type PromotionRefundInput = {
  promotionId: string;
  reason: string;
};

type ExternalPromotionFormInput = {
  propertyId: string;
  businessName: string;
  headline: string;
  description: string;
  imageUrl: string | null;
  ctaText: string;
  ctaLink: string;
  externalContactName: string | null;
  externalContactEmail: string | null;
  externalContactPhone: string | null;
  startDate: string;
  endDate: string;
};

function throwIfError(error: SupabaseError | null | undefined): void {
  if (error) throw new Error(error.message);
}

function selectedPropertyId(propertyIds: string[], requested?: string | null): string {
  if (requested && propertyIds.includes(requested)) return requested;
  return propertyIds[0] ?? '';
}

function toProperty(row: AdminProperty): AdminProperty {
  return row;
}

async function getAssignedProperties(propertyIds: string[]): Promise<AdminProperty[]> {
  if (propertyIds.length === 0) return [];
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .in('id', propertyIds)
    .order('name', { ascending: true });
  throwIfError(error);
  return ((data ?? []) as AdminProperty[]).map(toProperty);
}

export async function getAdminProperties(): Promise<AdminProperty[]> {
  const context = await requireAdminAction();
  return getAssignedProperties(context.propertyIds);
}

export async function getAdminDashboardData(requestedPropertyId?: string | null): Promise<AdminDashboardData> {
  const context = await requireAdminAction();
  const properties = await getAssignedProperties(context.propertyIds);
  const propertyId = selectedPropertyId(context.propertyIds, requestedPropertyId);

  if (!propertyId) {
    return {
      properties,
      selectedPropertyId: '',
      stats: null,
      recentActivity: [],
    };
  }

  assertAdminPropertyAccess(context, propertyId);
  const supabase = createServiceRoleClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [businesses, profiles, promotions, recentProfiles, recentPromotions] = await Promise.all([
    supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('property_id', propertyId),
    supabase.from('profiles').select('id, status', { count: 'exact' }).contains('property_ids', [propertyId]),
    supabase
      .from('promotions')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', propertyId)
      .eq('review_status', 'approved')
      .gte('created_at', thirtyDaysAgo),
    supabase
      .from('profiles')
      .select('id, email, created_at, status')
      .contains('property_ids', [propertyId])
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('promotions')
      .select('id, business_name, headline, created_at, review_status')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  throwIfError(businesses.error);
  throwIfError(profiles.error);
  throwIfError(promotions.error);
  throwIfError(recentProfiles.error);
  throwIfError(recentPromotions.error);

  const profileRows = profiles.data ?? [];
  const stats: AdminStats = {
    totalTenants: businesses.count ?? 0,
    activeAccounts: profileRows.filter((profile) => profile.status === 'active').length,
    pendingInvites: profileRows.filter((profile) => profile.status === 'invited').length,
    activePromotions: promotions.count ?? 0,
  };

  const tenantActivity: AdminActivity[] = (recentProfiles.data ?? []).map((profile) => ({
    id: profile.id,
    type: 'tenant',
    label: profile.email || 'New tenant',
    sublabel: profile.status === 'invited' ? 'Invited' : 'Joined',
    created_at: profile.created_at,
  }));

  const promotionActivity: AdminActivity[] = (recentPromotions.data ?? []).map((promotion) => ({
    id: promotion.id,
    type: 'promotion',
    label: promotion.business_name || 'Unknown business',
    sublabel: `Promotion: ${promotion.headline ?? ''}`,
    created_at: promotion.created_at,
  }));

  return {
    properties,
    selectedPropertyId: propertyId,
    stats,
    recentActivity: [...tenantActivity, ...promotionActivity]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8),
  };
}

export async function getAdminTenants(params: {
  propertyId?: string | null;
  status?: string | null;
  search?: string | null;
}): Promise<{ properties: AdminProperty[]; selectedPropertyId: string; tenants: AdminTenant[] }> {
  const context = await requireAdminAction();
  const properties = await getAssignedProperties(context.propertyIds);
  const propertyId = selectedPropertyId(context.propertyIds, params.propertyId);
  if (!propertyId) return { properties, selectedPropertyId: '', tenants: [] };
  assertAdminPropertyAccess(context, propertyId);

  const supabase = createServiceRoleClient();
  const [profiles, businesses] = await Promise.all([
    supabase.from('profiles').select('*').contains('property_ids', [propertyId]).order('created_at', { ascending: false }),
    supabase.from('businesses').select('*').eq('property_id', propertyId),
  ]);
  throwIfError(profiles.error);
  throwIfError(businesses.error);

  const businessByEmail = new Map<string, AdminBusiness>();
  for (const business of (businesses.data ?? []) as AdminBusiness[]) {
    businessByEmail.set(business.owner_email, business);
  }

  let tenants = ((profiles.data ?? []) as AdminProfile[]).map((profile) => ({
    profile,
    business: businessByEmail.get(profile.email) ?? null,
  }));

  const status = params.status?.toLowerCase();
  if (status && status !== 'all') tenants = tenants.filter((tenant) => tenant.profile.status === status);

  const search = params.search?.trim().toLowerCase();
  if (search) {
    tenants = tenants.filter((tenant) =>
      tenant.profile.email.toLowerCase().includes(search) ||
      (tenant.profile.full_name ?? '').toLowerCase().includes(search) ||
      (tenant.profile.display_name ?? '').toLowerCase().includes(search) ||
      (tenant.business?.business_name ?? '').toLowerCase().includes(search)
    );
  }

  return { properties, selectedPropertyId: propertyId, tenants };
}

export async function inviteTenantsAction(tenants: TenantImportInput[]): Promise<TenantImportResult> {
  const context = await requireAdminAction();
  for (const tenant of tenants) {
    assertAdminPropertyAccess(context, tenant.property_id);
  }

  const auth = await createServerSupabaseClient();
  const { data, error } = await auth.functions.invoke('invite-tenant', { body: { tenants } });
  throwIfError(error);
  revalidatePath('/admin/tenants');
  revalidatePath('/admin');
  return data as TenantImportResult;
}

export async function inviteSingleTenantAction(tenant: TenantImportInput): Promise<TenantImportResult> {
  return inviteTenantsAction([tenant]);
}

export async function inviteTenantAction(tenant: TenantImportInput): Promise<void> {
  await inviteTenantsAction([tenant]);
}

export async function setTenantStatusAction(profileId: string, status: 'active' | 'inactive'): Promise<void> {
  const context = await requireAdminAction();
  const supabase = createServiceRoleClient();
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('id, property_ids')
    .eq('id', profileId)
    .single();
  throwIfError(fetchError);
  const tenantPropertyIds = normalizePropertyIds(profile?.property_ids);
  const canEdit = context.propertyIds.some((propertyId) => tenantPropertyIds.includes(propertyId));
  if (!canEdit) throw new Error('You do not have access to this tenant');

  const { error } = await supabase.from('profiles').update({ status }).eq('id', profileId);
  throwIfError(error);
  revalidatePath('/admin/tenants');
  revalidatePath('/admin');
}

export async function disableTenantAction(profileId: string): Promise<void> {
  return setTenantStatusAction(profileId, 'inactive');
}

export async function reactivateTenantAction(profileId: string): Promise<void> {
  return setTenantStatusAction(profileId, 'active');
}

export async function getAdvertiserAccounts(status?: AdvertiserAccount['status'] | 'all'): Promise<AdvertiserAccount[]> {
  await requireAdminAction();
  const supabase = createServiceRoleClient();
  let query = supabase.from('advertiser_profiles').select('*').order('created_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);
  const { data, error } = await query;
  throwIfError(error);
  return (data ?? []) as AdvertiserAccount[];
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

export async function getAdminPromotions(params: {
  propertyId?: string | null;
  segment?: string | null;
}): Promise<{ properties: AdminProperty[]; selectedPropertyId: string; promotions: AdminPromotion[] }> {
  const context = await requireAdminAction();
  const properties = await getAssignedProperties(context.propertyIds);
  const propertyId = selectedPropertyId(context.propertyIds, params.propertyId);
  if (!propertyId) return { properties, selectedPropertyId: '', promotions: [] };
  assertAdminPropertyAccess(context, propertyId);

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });
  throwIfError(error);

  let promotions = (data ?? []) as AdminPromotion[];
  switch (params.segment) {
    case 'Pending':
      promotions = promotions.filter((promotion) => promotion.review_status === 'pending');
      break;
    case 'Approved':
      promotions = promotions.filter((promotion) => ['approved', 'suspended'].includes(promotion.review_status));
      break;
    case 'Rejected':
      promotions = promotions.filter((promotion) => ['rejected', 'expired'].includes(promotion.review_status));
      break;
    case 'External':
      promotions = promotions.filter((promotion) => promotion.advertiser_id === null);
      break;
  }

  return { properties, selectedPropertyId: propertyId, promotions };
}

export async function getAdminPromotionDetail(id: string): Promise<{
  promotion: AdminPromotion;
  anomaly: boolean;
}> {
  const context = await requireAdminAction();
  const supabase = createServiceRoleClient();
  const { data: promotion, error } = await supabase.from('promotions').select('*').eq('id', id).single();
  throwIfError(error);
  if (!promotion) throw new Error('Promotion not found');
  assertAdminPropertyAccess(context, promotion.property_id);

  let anomaly = false;
  if (promotion.payment_status === 'paid') {
    const { data: attempts, error: attemptError } = await supabase
      .from('promotion_payment_attempts')
      .select('id')
      .eq('promotion_id', id)
      .eq('status', 'completed')
      .limit(1);
    if (attemptError || (attempts?.length ?? 0) === 0) anomaly = true;
  }

  return { promotion: promotion as AdminPromotion, anomaly };
}

export async function applyPromotionReviewAction(
  promotionId: string,
  action: AdminPromotionReviewAction
): Promise<void> {
  const context = await requireAdminAction();
  const supabase = createServiceRoleClient();
  const { data: promotion, error } = await supabase
    .from('promotions')
    .select('id, property_id, review_status, payment_status')
    .eq('id', promotionId)
    .single();
  throwIfError(error);
  if (!promotion) throw new Error('Promotion not found');
  assertAdminPropertyAccess(context, promotion.property_id);
  if (promotion.review_status !== 'pending') throw new Error('Promotion is not pending review');

  const now = new Date().toISOString();
  let reviewStatus: AdminPromotion['review_status'];
  let paymentStatus: AdminPromotion['payment_status'] = promotion.payment_status;
  let note: string | null = null;

  if (action.action === 'approve') {
    reviewStatus = 'approved';
  } else if (action.action === 'allow_revision') {
    reviewStatus = 'revision_requested';
    note = action.note.trim();
  } else if (action.action === 'require_repayment') {
    reviewStatus = 'revision_requested';
    paymentStatus = 'repayment_required';
    note = action.note.trim();
  } else {
    reviewStatus = 'rejected';
    note = action.note.trim();
  }

  const { error: updateError } = await supabase
    .from('promotions')
    .update({
      review_status: reviewStatus,
      payment_status: paymentStatus,
      reviewed_by: context.user.id,
      reviewed_at: now,
      review_note: action.action === 'approve' ? null : note,
    })
    .eq('id', promotionId);
  throwIfError(updateError);

  const { error: eventError } = await supabase.from('promotion_status_events').insert({
    promotion_id: promotionId,
    from_review_status: promotion.review_status,
    to_review_status: reviewStatus,
    from_payment_status: promotion.payment_status,
    to_payment_status: paymentStatus,
    actor_user_id: context.user.id,
    actor_type: 'admin',
    note,
  });
  throwIfError(eventError);
  revalidatePath('/admin/promotions');
  revalidatePath(`/admin/promotions/${promotionId}`);
}

export async function submitPromotionReviewAction(input: PromotionReviewActionInput): Promise<void> {
  if (input.action === 'approve') {
    return applyPromotionReviewAction(input.promotionId, { action: 'approve' });
  }

  return applyPromotionReviewAction(input.promotionId, { action: input.action, note: input.note });
}

export async function togglePromotionSuspendAction(promotionId: string): Promise<void> {
  const context = await requireAdminAction();
  const supabase = createServiceRoleClient();
  const { data: promotion, error } = await supabase
    .from('promotions')
    .select('id, property_id, review_status')
    .eq('id', promotionId)
    .single();
  throwIfError(error);
  if (!promotion) throw new Error('Promotion not found');
  assertAdminPropertyAccess(context, promotion.property_id);
  if (!['approved', 'suspended'].includes(promotion.review_status)) {
    throw new Error('Promotion cannot be suspended or reinstated');
  }

  const newStatus = promotion.review_status === 'approved' ? 'suspended' : 'approved';
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('promotions')
    .update({ review_status: newStatus, reviewed_by: context.user.id, reviewed_at: now })
    .eq('id', promotionId);
  throwIfError(updateError);
  const { error: eventError } = await supabase.from('promotion_status_events').insert({
    promotion_id: promotionId,
    from_review_status: promotion.review_status,
    to_review_status: newStatus,
    actor_user_id: context.user.id,
    actor_type: 'admin',
    note: null,
  });
  throwIfError(eventError);
  revalidatePath('/admin/promotions');
  revalidatePath(`/admin/promotions/${promotionId}`);
}

export async function submitPromotionSuspensionAction(input: PromotionSuspensionInput): Promise<void> {
  return togglePromotionSuspendAction(input.promotionId);
}

export async function issuePromotionRefundAction(promotionId: string, reason: string): Promise<void> {
  const context = await requireAdminAction();
  const supabase = createServiceRoleClient();
  const { data: promotion, error } = await supabase
    .from('promotions')
    .select('id, property_id')
    .eq('id', promotionId)
    .single();
  throwIfError(error);
  if (!promotion) throw new Error('Promotion not found');
  assertAdminPropertyAccess(context, promotion.property_id);

  const auth = await createServerSupabaseClient();
  const { error: invokeError } = await auth.functions.invoke('issue-refund', {
    body: { promotionId, reason: reason.trim() },
  });
  throwIfError(invokeError);
  revalidatePath('/admin/promotions');
  revalidatePath(`/admin/promotions/${promotionId}`);
}

export async function submitPromotionRefundAction(input: PromotionRefundInput): Promise<void> {
  return issuePromotionRefundAction(input.promotionId, input.reason);
}

export async function createExternalPromotionAction(input: ExternalPromotionInput): Promise<string> {
  const context = await requireAdminAction();
  assertAdminPropertyAccess(context, input.propertyId);
  if (input.endDate <= input.startDate) throw new Error('End date must be after start date');

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('promotions')
    .insert({
      property_id: input.propertyId,
      advertiser_id: null,
      created_by_admin_id: context.user.id,
      business_name: input.businessName.trim(),
      headline: input.headline.trim(),
      description: input.description.trim(),
      image_url: input.imageUrl,
      cta_text: input.ctaText.trim(),
      cta_link: input.ctaLink.trim(),
      external_contact_name: input.externalContactName?.trim() || null,
      external_contact_email: input.externalContactEmail?.trim() || null,
      external_contact_phone: input.externalContactPhone?.trim() || null,
      start_date: input.startDate,
      end_date: input.endDate,
      review_status: 'approved',
      payment_status: null,
    })
    .select('id')
    .single();
  throwIfError(error);
  if (!data) throw new Error('Promotion creation did not return an id');
  revalidatePath('/admin/promotions');
  revalidatePath('/admin');
  return data.id as string;
}

export async function createExternalPromotionFromFormAction(input: ExternalPromotionFormInput): Promise<string> {
  return createExternalPromotionAction(input);
}

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

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=1`,
      { headers: { Accept: 'application/json', 'User-Agent': 'UNIT-portal/1.0' } }
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as Array<{ lat: string; lon: string }>;
    const lat = Number(payload[0]?.lat);
    const lon = Number(payload[0]?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch {
    return null;
  }
}

export async function createPropertyAction(input: PropertyInput): Promise<string> {
  const context = await requireAdminAction();
  const units = Number(input.totalUnits ?? 0);
  if (!input.name.trim() || !input.address.trim() || !input.city.trim() || !input.state.trim()) {
    throw new Error('Name, address, city, and state are required');
  }
  if (!Number.isFinite(units) || units < 0) throw new Error('Total units must be a non-negative number');

  const fullAddress = `${input.address.trim()}, ${input.city.trim()}, ${input.state.trim()}`;
  const coords = await geocodeAddress(fullAddress);
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('properties')
    .insert({
      name: input.name.trim(),
      address: input.address.trim(),
      city: input.city.trim(),
      state: input.state.trim().toUpperCase(),
      type: input.type?.trim() || 'commercial',
      total_units: units,
      image_url: null,
      latitude: coords?.lat ?? null,
      longitude: coords?.lon ?? null,
    })
    .select('id')
    .single();
  throwIfError(error);
  if (!data) throw new Error('Property creation did not return an id');

  const nextPropertyIds = Array.from(new Set([...context.propertyIds, data.id as string]));
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ property_ids: nextPropertyIds })
    .eq('id', context.user.id);
  throwIfError(updateError);
  revalidatePath('/admin/properties');
  revalidatePath('/admin');
  return data.id as string;
}

export async function sendPushBroadcastAction(input: PushBroadcastInput): Promise<{ sent: number; failed: number; total: number }> {
  const context = await requireAdminAction();
  assertAdminPropertyAccess(context, input.propertyId);
  if (input.title.trim().length === 0 || input.title.length > 50) throw new Error('Title must be 1-50 characters');
  if (input.message.trim().length === 0 || input.message.length > 200) throw new Error('Message must be 1-200 characters');

  const auth = await createServerSupabaseClient();
  const { data, error } = await auth.functions.invoke('send-push-notification', {
    body: {
      property_id: input.propertyId,
      title: input.title.trim(),
      message: input.message.trim(),
      audience: input.audience,
      data: { type: 'broadcast' },
    },
  });
  throwIfError(error);
  revalidatePath('/admin/push');
  return data as { sent: number; failed: number; total: number };
}

export async function getBroadcastHistory(propertyId?: string | null): Promise<{
  properties: AdminProperty[];
  selectedPropertyId: string;
  notifications: AdminNotification[];
}> {
  const context = await requireAdminAction();
  const properties = await getAssignedProperties(context.propertyIds);
  const selected = selectedPropertyId(context.propertyIds, propertyId);
  if (!selected) return { properties, selectedPropertyId: '', notifications: [] };
  assertAdminPropertyAccess(context, selected);
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('property_id', selected)
    .eq('type', 'broadcast')
    .order('created_date', { ascending: false })
    .limit(20);
  throwIfError(error);
  return {
    properties,
    selectedPropertyId: selected,
    notifications: (data ?? []) as AdminNotification[],
  };
}

export async function logoutAdminAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}
