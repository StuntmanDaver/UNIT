// services/promotionPricing.ts
import { supabase } from './supabase';

export type PromotionPriceTier = {
  id: string;
  name: string;
  duration_days: number;
  is_featured: boolean;
  price_cents: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type UpsertTierInput = {
  id?: string;
  name: string;
  duration_days: number;
  is_featured: boolean;
  price_cents: number;
  currency?: string;
  is_active?: boolean;
};

export const promotionPricingService = {
  /**
   * List all price tiers ordered by price ascending.
   * Admin-authed calls see all (active + inactive) via the FULL ACCESS policy.
   * Tenant-authed calls see only active tiers via the SELECT policy.
   */
  async listTiers(): Promise<PromotionPriceTier[]> {
    const { data, error } = await supabase
      .from('promotion_price_tiers')
      .select('*')
      .order('price_cents', { ascending: true });
    if (error) throw error;
    return data;
  },

  /**
   * Create or update a price tier.
   * Pass id to update an existing row; omit id to insert a new one.
   */
  async upsertTier(input: UpsertTierInput): Promise<PromotionPriceTier> {
    const payload = {
      name: input.name,
      duration_days: input.duration_days,
      is_featured: input.is_featured,
      price_cents: input.price_cents,
      currency: input.currency ?? 'usd',
      is_active: input.is_active ?? true,
    };

    if (input.id) {
      const { data, error } = await supabase
        .from('promotion_price_tiers')
        .update(payload)
        .eq('id', input.id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from('promotion_price_tiers')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Soft-delete a tier by setting is_active=false.
   * Existing promotion_payment_attempts that reference this tier are unaffected.
   */
  async deactivateTier(id: string): Promise<void> {
    const { error } = await supabase
      .from('promotion_price_tiers')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;
  },
};
