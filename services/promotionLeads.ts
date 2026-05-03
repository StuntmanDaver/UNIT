// services/promotionLeads.ts
//
// Thin TypeScript types for the promotion_leads table added by
// migration 20260501000001_promotion_leads_pipeline.sql. This is V2
// scaffolding — the migration explicitly states "table is intentionally
// unused at rest until the V2 sales workflow is built." US-002 only
// adds types so service code can reference the table without `any`.
// Read-only / mutation helpers land in US-015.

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
