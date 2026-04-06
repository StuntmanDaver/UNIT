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
        .from('advertiser_promotions')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId)
        .eq('approval_status', 'approved')
        .gte('created_at', thirtyDaysAgo),
    ]);

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
};
