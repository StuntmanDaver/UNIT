import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { loadEnv } from './e2e/lib.mjs';

loadEnv();

const auditPath = path.join(process.cwd(), 'scripts', 'relationship-audit.sql');
const databaseUrl = process.env.RELATIONSHIP_AUDIT_DATABASE_URL ?? process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!fs.existsSync(auditPath)) {
  console.error(`Relationship audit SQL not found: ${auditPath}`);
  process.exit(1);
}

if (databaseUrl) {
  const result = spawnSync('psql', ['-v', 'ON_ERROR_STOP=1', '-f', auditPath], {
    env: {
      ...process.env,
      PGDATABASE: databaseUrl,
    },
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`Failed to run psql: ${result.error.message}`);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Set RELATIONSHIP_AUDIT_DATABASE_URL/DATABASE_URL, or configure NEXT_PUBLIC_SUPABASE_URL/EXPO_PUBLIC_SUPABASE_URL plus SUPABASE_SERVICE_ROLE_KEY.',
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

try {
  const results = await runSupabaseApiAudit();
  printResults(results);
  process.exit(results.some((result) => result.count > 0) ? 1 : 0);
} catch (error) {
  console.error(`Relationship audit failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

async function runSupabaseApiAudit() {
  const [
    authUsers,
    profiles,
    properties,
    advertiserProfiles,
    promotions,
    promotionStatusEvents,
    promotionPaymentAttempts,
    notifications,
    businesses,
  ] = await Promise.all([
    listAuthUsers(),
    selectAll('profiles', 'id, email, role, status, property_ids'),
    selectAll('properties', 'id, name'),
    selectAll('advertiser_profiles', 'id, business_name, contact_email, status'),
    selectAll('promotions', 'id, property_id, advertiser_id, business_name, review_status, payment_status'),
    selectAll('promotion_status_events', 'promotion_id, to_review_status, actor_type'),
    selectAll('promotion_payment_attempts', 'id, promotion_id, status'),
    selectAll('notifications', 'id, user_id, property_id'),
    selectAll('businesses', 'id, owner_email, property_id'),
  ]);

  const authUserIds = new Set(authUsers.map((user) => user.id));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const profileByEmail = new Map(profiles.map((profile) => [profile.email, profile]));
  const propertyIds = new Set(properties.map((property) => property.id));
  const advertiserProfileIds = new Set(advertiserProfiles.map((profile) => profile.id));
  const promotionIds = new Set(promotions.map((promotion) => promotion.id));

  const hasProperty = (profile, propertyId) => Array.isArray(profile?.property_ids) && profile.property_ids.includes(propertyId);
  const isEmptyPropertySet = (profile) => !Array.isArray(profile?.property_ids) || profile.property_ids.length === 0;

  return [
    row('profiles_without_auth', profiles.filter((profile) => !authUserIds.has(profile.id)).length),
    row('auth_without_profile', authUsers.filter((user) => !profileById.has(user.id)).length),
    row(
      'tenant_profiles_missing_property_ids',
      profiles.filter(
        (profile) => profile.role === 'tenant' && profile.status === 'active' && isEmptyPropertySet(profile),
      ).length,
    ),
    row(
      'properties_without_owner',
      properties.filter(
        (property) =>
          !profiles.some((profile) => profile.role === 'landlord' && hasProperty(profile, property.id)),
      ).length,
    ),
    row(
      'active_advertiser_without_active_tenant_profile',
      advertiserProfiles.filter((advertiserProfile) => {
        if (advertiserProfile.status !== 'active') return false;
        const profile = profileById.get(advertiserProfile.id);
        return !profile || profile.role !== 'tenant' || profile.status !== 'active';
      }).length,
    ),
    row(
      'active_advertiser_without_property_assignment',
      advertiserProfiles.filter((advertiserProfile) => {
        if (advertiserProfile.status !== 'active') return false;
        const profile = profileById.get(advertiserProfile.id);
        return profile?.role === 'tenant' && isEmptyPropertySet(profile);
      }).length,
    ),
    row(
      'tenant_advertiser_status_mismatch',
      profiles.filter((profile) => {
        if (profile.role !== 'tenant') return false;
        const advertiserProfile = advertiserProfiles.find((candidate) => candidate.id === profile.id);
        if (!advertiserProfile) return false;
        return (
          (profile.status === 'active' && advertiserProfile.status !== 'active') ||
          (profile.status === 'inactive' && advertiserProfile.status !== 'suspended') ||
          (profile.status === 'invited' && advertiserProfile.status !== 'pending')
        );
      }).length,
    ),
    row(
      'profiles_not_in_advertiser_profiles',
      profiles.filter(
        (profile) =>
          profile.role === 'tenant' &&
          ['active', 'invited'].includes(profile.status) &&
          businesses.some((business) => normalizedEquals(business.owner_email, profile.email)) &&
          !advertiserProfileIds.has(profile.id),
      ).length,
    ),
    row(
      'advertiser_profiles_without_profile',
      advertiserProfiles.filter((advertiserProfile) => !profileById.has(advertiserProfile.id)).length,
    ),
    row(
      'advertiser_profiles_not_active_for_tenant_advertisers',
      profiles.filter((profile) => {
        const advertiserProfile = advertiserProfiles.find((candidate) => candidate.id === profile.id);
        return (
          profile.role === 'tenant' &&
          profile.status === 'active' &&
          Boolean(advertiserProfile) &&
          advertiserProfile.status !== 'active'
        );
      }).length,
    ),
    row('promotions_missing_property', promotions.filter((promotion) => !propertyIds.has(promotion.property_id)).length),
    row(
      'promotions_missing_advertiser_profile',
      promotions.filter(
        (promotion) => promotion.advertiser_id && !advertiserProfileIds.has(promotion.advertiser_id),
      ).length,
    ),
    row(
      'promotion_property_not_in_advertiser_profile',
      promotions.filter((promotion) => {
        if (!promotion.advertiser_id) return false;
        const profile = profileById.get(promotion.advertiser_id);
        return profile?.role === 'tenant' && !hasProperty(profile, promotion.property_id);
      }).length,
    ),
    row(
      'external_promotions_without_business_name',
      promotions.filter(
        (promotion) => !promotion.advertiser_id && String(promotion.business_name ?? '').trim() === '',
      ).length,
    ),
    row(
      'approved_promotions_without_approval_event',
      promotions.filter((promotion) => {
        if (promotion.review_status !== 'approved') return false;
        return !promotionStatusEvents.some(
          (event) =>
            event.promotion_id === promotion.id &&
            event.to_review_status === 'approved' &&
            (!promotion.advertiser_id || ['admin', 'system', 'webhook'].includes(event.actor_type)),
        );
      }).length,
    ),
    row(
      'paid_promotions_without_completed_attempt',
      promotions.filter(
        (promotion) =>
          promotion.payment_status === 'paid' &&
          !promotionPaymentAttempts.some(
            (attempt) => attempt.promotion_id === promotion.id && attempt.status === 'completed',
          ),
      ).length,
    ),
    row(
      'notifications_user_not_found',
      notifications.filter((notification) => !profileById.has(notification.user_id)).length,
    ),
    row(
      'notifications_property_not_in_user_profile',
      notifications.filter((notification) => {
        const profile = profileById.get(notification.user_id);
        return profile && (isEmptyPropertySet(profile) || !hasProperty(profile, notification.property_id));
      }).length,
    ),
    row(
      'businesses_without_owner_profile',
      businesses.filter((business) => !profileByEmail.has(business.owner_email)).length,
    ),
    row(
      'business_owner_property_mismatch',
      businesses.filter((business) => {
        const profile = profileByEmail.get(business.owner_email);
        return profile?.role === 'tenant' && !hasProperty(profile, business.property_id);
      }).length,
    ),
    row(
      'promotion_payment_attempts_without_promotion',
      promotionPaymentAttempts.filter((attempt) => !promotionIds.has(attempt.promotion_id)).length,
    ),
  ];
}

async function listAuthUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...(data.users ?? []));
    if (!data.users || data.users.length < 1000) return users;
  }
}

async function selectAll(table, columns) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase.from(table).select(columns).range(from, to);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}

function row(checkName, count) {
  return { check_name: checkName, count };
}

function printResults(results) {
  const checkWidth = Math.max('check_name'.length, ...results.map((result) => result.check_name.length));
  const countWidth = Math.max('count'.length, ...results.map((result) => String(result.count).length));
  console.log(`${'check_name'.padEnd(checkWidth)} | ${'count'.padStart(countWidth)}`);
  console.log(`${'-'.repeat(checkWidth)}-+-${'-'.repeat(countWidth)}`);
  for (const result of results) {
    console.log(`${result.check_name.padEnd(checkWidth)} | ${String(result.count).padStart(countWidth)}`);
  }
}

function normalizedEquals(left, right) {
  return String(left ?? '').toLowerCase() === String(right ?? '').toLowerCase();
}
