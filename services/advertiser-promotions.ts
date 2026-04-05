import { supabase } from './supabase';

export type AdvertiserPromotion = {
  id: string;
  property_id: string;
  business_name: string;
  business_type: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  headline: string;
  description: string | null;
  image_url: string | null;
  cta_link: string | null;
  cta_text: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

export const advertiserPromotionsService = {
  async filter(
    filters: Record<string, string>,
    orderBy = 'created_at',
    ascending = false
  ): Promise<AdvertiserPromotion[]> {
    let query = supabase.from('advertiser_promotions').select('*');
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    query = query.order(orderBy, { ascending });
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getById(id: string): Promise<AdvertiserPromotion> {
    const { data, error } = await supabase
      .from('advertiser_promotions')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(promotionData: Partial<AdvertiserPromotion>): Promise<AdvertiserPromotion> {
    const { data, error } = await supabase
      .from('advertiser_promotions')
      .insert(promotionData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStatus(
    id: string,
    approvalStatus: 'approved' | 'rejected',
    approvedBy: string
  ): Promise<AdvertiserPromotion> {
    const { data, error } = await supabase
      .from('advertiser_promotions')
      .update({
        approval_status: approvalStatus,
        approved_by: approvedBy,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
