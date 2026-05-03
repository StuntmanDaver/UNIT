-- Migration: Initiative 3 — Sales Pipeline DB Prep (V2 scaffolding)
-- Source: customer feedback 2026-04-29, Engagement & UI Enhancement Initiatives
-- Adds the promotion_leads table and 6-stage lifecycle enum so the V2
-- Kanban-style outbound sales workflow can be expanded later without
-- rebuilding the system. NO UI in this phase — table is intentionally
-- unused at rest until the V2 sales workflow is built.

BEGIN;

-- ================================================================
-- 1. Lead-stage enum (six stages from customer doc, in pipeline order)
-- ================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promotion_lead_stage') THEN
    CREATE TYPE promotion_lead_stage AS ENUM (
      'hot_lead',
      'contacted',
      'pending_approval',
      'pre_production',
      'approved',
      'published'
    );
  END IF;
END $$;

-- ================================================================
-- 2. promotion_leads table
--    Tracks outbound prospects (external local businesses) BEFORE
--    they convert to a real promotions row. promotion_id is
--    populated only when a lead converts to a published promotion.
-- ================================================================
CREATE TABLE IF NOT EXISTS promotion_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  target_property_ids uuid[] NOT NULL DEFAULT '{}',
  stage promotion_lead_stage NOT NULL DEFAULT 'hot_lead',
  owner_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  promotion_id uuid REFERENCES promotions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promotion_leads_stage
  ON promotion_leads(stage, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_promotion_leads_owner
  ON promotion_leads(owner_user_id, stage)
  WHERE owner_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_promotion_leads_promotion
  ON promotion_leads(promotion_id)
  WHERE promotion_id IS NOT NULL;

-- ================================================================
-- 3. Auto-update updated_at on row change
-- ================================================================
CREATE OR REPLACE FUNCTION promotion_leads_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promotion_leads_updated_at ON promotion_leads;
CREATE TRIGGER trg_promotion_leads_updated_at
  BEFORE UPDATE ON promotion_leads
  FOR EACH ROW
  EXECUTE FUNCTION promotion_leads_set_updated_at();

-- ================================================================
-- 4. RLS — admin (landlord) only
--    No tenant or advertiser access; this is an outbound sales table.
-- ================================================================
ALTER TABLE promotion_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage promotion leads"
  ON promotion_leads FOR ALL
  USING (is_landlord())
  WITH CHECK (is_landlord());

COMMIT;
