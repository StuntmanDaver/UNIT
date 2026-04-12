-- Migration 005: Financial Operations & Workflows (Phase 2)
-- SLA/assignment columns on recommendations, cron indexes, tenant invoice RLS

-- ============================================================
-- SECTION 1: SLA/assignment columns on recommendations
-- ============================================================

ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS assigned_to text,
  ADD COLUMN IF NOT EXISTS sla_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS escalated boolean NOT NULL DEFAULT false;

-- ============================================================
-- SECTION 2: Performance indexes for cron jobs
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_recommendations_escalated ON recommendations(escalated);
CREATE INDEX IF NOT EXISTS idx_recommendations_sla_deadline ON recommendations(sla_deadline);
CREATE INDEX IF NOT EXISTS idx_invoices_status_due ON invoices(status, due_date);

-- ============================================================
-- SECTION 3: Tenant invoice read-access RLS policy (D-04)
-- Tenants can SELECT invoices where their email matches the business owner_email.
-- This adds a second SELECT policy alongside the existing landlord SELECT policy.
-- Supabase uses OR logic for multiple policies on the same operation.
-- Per D-01: tenants are read-only — no INSERT/UPDATE/DELETE for tenants.
-- ============================================================

CREATE POLICY "Tenants can view own invoices"
  ON invoices FOR SELECT TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_email = auth.jwt()->>'email'
    )
  );
