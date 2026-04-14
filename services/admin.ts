import { supabase } from './supabase';

export type TenantImportInput = {
  email: string;
  business_name: string;
  category: string;
  contact_name?: string;
  contact_phone?: string;
  services?: string;
  description?: string;
  property_id: string;
};

export type ImportResult = {
  imported: number;
  failed: Array<{ email: string; reason: string }>;
  total: number;
};

export const adminService = {
  async inviteTenants(tenants: TenantImportInput[]): Promise<ImportResult> {
    const { data, error } = await supabase.functions.invoke('invite-tenant', {
      body: { tenants },
    });
    if (error) throw error;
    return data;
  },

  async completeOnboarding(propertyId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('complete-onboarding', {
      body: { property_id: propertyId },
    });
    if (error) throw error;
  },

  async addPropertyToAdmin(propertyId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('add-property-to-admin', {
      body: { property_id: propertyId },
    });
    if (error) throw error;
  },

  async sendPush(params: {
    property_id: string;
    title: string;
    message: string;
    data?: { type: string; id?: string };
    audience?: 'all' | 'active';
    exclude_email?: string;
  }): Promise<{ sent: number; failed: number }> {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: params,
    });
    if (error) throw error;
    return data;
  },

  async getStats(propertyId: string): Promise<{
    totalTenants: number;
    activeAccounts: number;
    pendingInvites: number;
    activePromotions: number;
  }> {
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const [businesses, profiles, promotions] = await Promise.all([
      supabase
        .from('businesses')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId),
      supabase
        .from('profiles')
        .select('id, status', { count: 'exact' })
        .contains('property_ids', [propertyId]),
      supabase
        .from('promotions')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId)
        .eq('review_status', 'approved')
        .gte('created_at', thirtyDaysAgo),
    ]);

    if (businesses.error) throw businesses.error;
    if (profiles.error) throw profiles.error;
    if (promotions.error) throw promotions.error;

    const profileData = profiles.data ?? [];
    const activeCount = profileData.filter((p) => p.status === 'active').length;
    const pendingCount = profileData.filter((p) => p.status === 'invited').length;

    return {
      totalTenants: businesses.count ?? 0,
      activeAccounts: activeCount,
      pendingInvites: pendingCount,
      activePromotions: promotions.count ?? 0,
    };
  },

  async getRecentActivity(propertyId: string): Promise<Array<{
    id: string;
    type: 'tenant' | 'promotion';
    label: string;
    sublabel: string;
    created_at: string;
  }>> {
    const [profilesRes, promotionsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, created_at, status')
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

    if (profilesRes.error) throw profilesRes.error;
    if (promotionsRes.error) throw promotionsRes.error;

    const tenantItems = (profilesRes.data ?? []).map((p) => ({
      id: p.id,
      type: 'tenant' as const,
      label: p.full_name || p.email || 'New tenant',
      sublabel: p.status === 'invited' ? 'Invited' : 'Joined',
      created_at: p.created_at,
    }));

    const promoItems = (promotionsRes.data ?? []).map((p) => ({
      id: p.id,
      type: 'promotion' as const,
      label: p.business_name || 'Unknown',
      sublabel: `Promotion: ${p.headline ?? ''}`,
      created_at: p.created_at,
    }));

    return [...tenantItems, ...promoItems]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);
  },
};
