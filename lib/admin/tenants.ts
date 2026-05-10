'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { assertAdminPropertyAccess, requireAdminAction } from './auth';
import { normalizePropertyIds } from './permissions';
import { getAssignedProperties, selectedPropertyId, throwIfError } from './shared';
import type { AdminBusiness, AdminProfile, AdminProperty, AdminTenant, TenantImportInput, TenantImportResult } from './types';

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

  const updates = status === 'active'
    ? { status, activated_at: new Date().toISOString() }
    : { status };

  const { error } = await supabase.from('profiles').update(updates).eq('id', profileId);
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
