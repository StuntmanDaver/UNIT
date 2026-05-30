#!/usr/bin/env node
import { join } from 'node:path';
import {
  assertRemoteWriteGuard,
  ensureDir,
  getSupabaseClient,
  loadEnv,
  parseArgs,
  resultsRoot,
  writeJson,
} from './lib.mjs';

loadEnv();

const args = parseArgs();
const target = String(args.target || process.env.E2E_TARGET || 'local');
const runId = String(args['run-id'] || process.env.E2E_RUN_ID || `e2e_sync_${Date.now()}`);

const accounts = {
  tenant: process.env.E2E_TENANT_EMAIL || 'tenant1@unit-test.com',
  resetTenant: process.env.E2E_RESET_TENANT_EMAIL || 'tenant-reset@unit-test.com',
  admin: process.env.E2E_ADMIN_EMAIL || 'david@cultrhealth.com',
};

const summary = {
  target,
  runId,
  accounts,
  checks: [],
};

function record(name, ok, detail = '') {
  summary.checks.push({ name, ok, detail });
}

function idsInclude(profile, propertyId) {
  return Array.isArray(profile?.property_ids) && profile.property_ids.includes(propertyId);
}

async function main() {
  assertRemoteWriteGuard(target);
  const supabase = getSupabaseClient();

  const profiles = await selectOrThrow(
    supabase
      .from('profiles')
      .select('id, email, role, status, property_ids, display_name, needs_password_change')
      .in('email', Object.values(accounts)),
    'profiles',
  );
  const tenant = profiles.find((profile) => profile.email === accounts.tenant);
  const resetTenant = profiles.find((profile) => profile.email === accounts.resetTenant);
  const admin = profiles.find((profile) => profile.email === accounts.admin);
  const propertyId = tenant?.property_ids?.[0];

  record('tenant profile active', tenant?.role === 'tenant' && tenant?.status === 'active', tenant?.id || 'missing tenant');
  record('admin profile landlord active', admin?.role === 'landlord' && admin?.status === 'active', admin?.id || 'missing admin');
  record('reset tenant requires password change', resetTenant?.needs_password_change === true, resetTenant?.id || 'missing reset tenant');
  record('tenant/admin share property', Boolean(propertyId && idsInclude(admin, propertyId)), propertyId || 'missing tenant property');
  record('reset tenant shares property', Boolean(propertyId && idsInclude(resetTenant, propertyId)), propertyId || 'missing tenant property');

  const properties = propertyId
    ? await selectOrThrow(supabase.from('properties').select('id, name').eq('id', propertyId), 'properties')
    : [];
  record('property exists', properties.length === 1, properties[0]?.name || 'missing property');

  const businesses = propertyId
    ? await selectOrThrow(
        supabase
          .from('businesses')
          .select('id, business_name, owner_email, contact_email, property_id')
          .eq('property_id', propertyId)
          .ilike('business_name', 'QA E2E%'),
        'businesses',
      )
    : [];
  const tenantBusiness = businesses.find((business) => business.owner_email === accounts.tenant);
  record('tenant business linked to tenant', Boolean(tenantBusiness), businesses.map((business) => business.business_name).join(', '));

  const advertiserProfiles = tenant
    ? await selectOrThrow(
        supabase.from('advertiser_profiles').select('id, business_name, contact_email, status').eq('id', tenant.id),
        'advertiser_profiles',
      )
    : [];
  const advertiser = advertiserProfiles[0];
  record('advertiser profile linked to tenant', advertiser?.status === 'active' && advertiser?.contact_email === accounts.tenant, advertiser?.business_name || 'missing advertiser');
  record(
    'business name syncs across tenant and advertiser',
    Boolean(tenantBusiness?.business_name && advertiser?.business_name && tenantBusiness.business_name === advertiser.business_name),
    `${tenantBusiness?.business_name || 'missing business'} / ${advertiser?.business_name || 'missing advertiser'}`,
  );

  const promotions = propertyId
    ? await selectOrThrow(
        supabase
          .from('promotions')
          .select('id, headline, advertiser_id, created_by_admin_id, business_name, review_status, payment_status, property_id')
          .eq('property_id', propertyId)
          .ilike('headline', 'QA E2E%'),
        'promotions',
      )
    : [];
  const tenantPromotions = promotions.filter((promotion) => promotion.advertiser_id === tenant?.id);
  const externalPromotion = promotions.find((promotion) => promotion.headline === 'QA E2E External Local Deal');
  record('tenant promotions linked to advertiser tenant', tenantPromotions.length >= 5, `${tenantPromotions.length} tenant promotions`);
  record('approved tenant promotion is paid', tenantPromotions.some((promotion) => promotion.review_status === 'approved' && promotion.payment_status === 'paid'), 'approved + paid required');
  record('pending tenant promotions are paid', tenantPromotions.filter((promotion) => promotion.review_status === 'pending' && promotion.payment_status === 'paid').length >= 4, 'pending paid promotions required');
  record('admin external promotion linked to landlord', externalPromotion?.advertiser_id === null && externalPromotion?.created_by_admin_id === admin?.id, externalPromotion?.id || 'missing external promotion');
  record(
    'promotion business names sync to advertiser',
    tenantPromotions.every((promotion) => promotion.business_name === advertiser?.business_name),
    tenantPromotions.map((promotion) => promotion.business_name).join(', '),
  );

  const notifications = tenant
    ? await selectOrThrow(
        supabase
          .from('notifications')
          .select('id, user_id, user_email, property_id, read, title')
          .eq('user_id', tenant.id)
          .eq('property_id', propertyId)
          .ilike('title', 'QA E2E%'),
        'notifications',
      )
    : [];
  record('tenant unread notification linked to property', notifications.some((notification) => notification.read === false), `${notifications.length} QA notifications`);

  const tiers = await selectOrThrow(
    supabase
      .from('promotion_price_tiers')
      .select('id, name, is_active, price_cents')
      .ilike('name', 'QA E2E%'),
    'promotion_price_tiers',
  );
  record('active QA pricing tiers exist', tiers.filter((tier) => tier.is_active && tier.price_cents > 0).length >= 3, `${tiers.length} QA tiers`);

  const failed = summary.checks.filter((check) => !check.ok);
  summary.ok = failed.length === 0;
  const dir = ensureDir(join(resultsRoot, runId));
  writeJson(join(dir, 'sync-summary.json'), summary);
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.ok ? 0 : 1);
}

async function selectOrThrow(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data ?? [];
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : JSON.stringify(error, null, 2));
  process.exit(1);
});
