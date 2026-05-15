import { supabase } from './supabase';

export type AdvertiserAccountStatus = 'pending' | 'active' | 'suspended';

export type AdvertiserAccount = {
  id: string;
  business_name: string;
  contact_email: string;
  status: AdvertiserAccountStatus;
  stripe_customer_id: string | null;
  created_at: string;
};

export type AdvertiserAccountWithCount = AdvertiserAccount & {
  promotion_count: number;
};

export const advertiserAccountsService = {
  async list(status: AdvertiserAccountStatus | 'all' = 'pending'): Promise<AdvertiserAccountWithCount[]> {
    let query = supabase
      .from('advertiser_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (error) throw error;

    const accounts = (data ?? []) as AdvertiserAccount[];
    if (accounts.length === 0) return [];

    const { data: promotions, error: promoError } = await supabase
      .from('promotions')
      .select('advertiser_id')
      .in('advertiser_id', accounts.map((a) => a.id));
    if (promoError) throw promoError;

    const counts = new Map<string, number>();
    for (const row of (promotions ?? []) as { advertiser_id: string | null }[]) {
      if (!row.advertiser_id) continue;
      counts.set(row.advertiser_id, (counts.get(row.advertiser_id) ?? 0) + 1);
    }

    return accounts.map((account) => ({
      ...account,
      promotion_count: counts.get(account.id) ?? 0,
    }));
  },

  async setStatus(advertiserId: string, status: AdvertiserAccountStatus): Promise<void> {
    const { error } = await supabase
      .from('advertiser_profiles')
      .update({ status })
      .eq('id', advertiserId);
    if (error) throw error;
  },
};
