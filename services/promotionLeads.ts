// services/promotionLeads.ts
//
// Thin TypeScript types and admin-only service for the promotion_leads table
// added by migration 20260501000001_promotion_leads_pipeline.sql. This is V2
// scaffolding — the migration explicitly states "table is intentionally unused
// at rest until the V2 sales workflow is built." Types were scaffolded in
// US-002; service functions land here in US-015. NO UI.

import { supabase } from './supabase';

/**
 * Six-stage outbound sales lifecycle. Mirrors the SQL enum
 * `promotion_lead_stage` — keep in lockstep with the migration.
 */
export type PromotionLeadStage =
  | 'hot_lead'
  | 'contacted'
  | 'pending_approval'
  | 'pre_production'
  | 'approved'
  | 'published';

export type PromotionLead = {
  id: string;
  business_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  target_property_ids: string[];
  stage: PromotionLeadStage;
  owner_user_id: string | null;
  notes: string | null;
  /**
   * Set only when a lead converts into a real promotions row (final
   * stage of the funnel). NULL while the lead is still in the pipeline.
   */
  promotion_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PromotionLeadFilters = {
  stage?: PromotionLeadStage;
  owner_user_id?: string;
};

export type CreateLeadInput = {
  business_name: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  target_property_ids?: string[];
  stage?: PromotionLeadStage;
  owner_user_id?: string | null;
  notes?: string | null;
};

export type UpdateLeadPatch = Partial<
  Pick<
    PromotionLead,
    | 'business_name'
    | 'contact_name'
    | 'contact_email'
    | 'contact_phone'
    | 'target_property_ids'
    | 'stage'
    | 'owner_user_id'
    | 'notes'
  >
>;

export const promotionLeadsService = {
  /**
   * Admin: list all leads, optionally filtered by stage and/or owner.
   * Ordered by updated_at DESC so the most recently touched lead surfaces first.
   */
  async listLeads(filters?: PromotionLeadFilters): Promise<PromotionLead[]> {
    let query = supabase
      .from('promotion_leads')
      .select('*')
      .order('updated_at', { ascending: false });

    if (filters?.stage) {
      query = query.eq('stage', filters.stage);
    }
    if (filters?.owner_user_id) {
      query = query.eq('owner_user_id', filters.owner_user_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  /**
   * Admin: create a new outbound sales lead.
   * stage defaults to 'hot_lead' (matches the DB column default).
   */
  async createLead(input: CreateLeadInput): Promise<PromotionLead> {
    const { data, error } = await supabase
      .from('promotion_leads')
      .insert({
        business_name: input.business_name,
        contact_name: input.contact_name ?? null,
        contact_email: input.contact_email ?? null,
        contact_phone: input.contact_phone ?? null,
        target_property_ids: input.target_property_ids ?? [],
        stage: input.stage ?? 'hot_lead',
        owner_user_id: input.owner_user_id ?? null,
        notes: input.notes ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Admin: patch a lead's mutable fields (stage, contact info, notes, owner).
   * updated_at is handled automatically by the DB trigger.
   */
  async updateLead(id: string, patch: UpdateLeadPatch): Promise<PromotionLead> {
    const { data, error } = await supabase
      .from('promotion_leads')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Admin: link a converted lead to its resulting promotions row.
   * Sets promotion_id and advances stage to 'published'. The promotions row
   * must already exist before calling this function.
   */
  async convertLeadToPromotion(
    leadId: string,
    promotionId: string
  ): Promise<PromotionLead> {
    const { data, error } = await supabase
      .from('promotion_leads')
      .update({ promotion_id: promotionId, stage: 'published' })
      .eq('id', leadId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },
};
