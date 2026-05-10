'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { assertAdminPropertyAccess, requireAdminAction } from './auth';
import { getAssignedProperties, selectedPropertyId, throwIfError } from './shared';
import type { AdminActivity, AdminDashboardData, AdminStats } from './types';

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
