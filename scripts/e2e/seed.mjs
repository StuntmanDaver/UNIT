#!/usr/bin/env node
import {
  assertRemoteWriteGuard,
  getSupabaseClient,
  loadEnv,
  parseArgs,
  writeJson,
  resultsRoot,
  ensureDir,
} from './lib.mjs';
import { join } from 'node:path';

loadEnv();

const args = parseArgs();
const target = String(args.target || process.env.E2E_TARGET || 'local');
const dryRun = Boolean(args['dry-run']) || process.env.E2E_DRY_RUN === '1';
const runId = String(args['run-id'] || process.env.E2E_RUN_ID || `e2e_seed_${Date.now()}`);

const accounts = {
  tenant: { email: process.env.E2E_TENANT_EMAIL || 'tenant1@unit-test.com', password: process.env.E2E_TENANT_PASSWORD || 'admin123', role: 'tenant' },
  resetTenant: { email: process.env.E2E_RESET_TENANT_EMAIL || 'tenant-reset@unit-test.com', password: process.env.E2E_RESET_TENANT_PASSWORD || 'TempPass123!', role: 'tenant' },
  admin: { email: process.env.E2E_ADMIN_EMAIL || 'david@cultrhealth.com', password: process.env.E2E_ADMIN_PASSWORD || 'admin123', role: 'landlord' },
};

const propertyName = 'QA E2E Property';
const nearbyPropertyName = 'QA E2E Nearby Property';
const outsidePropertyName = 'QA E2E Outside Radius Property';

async function main() {
  if (dryRun) {
    if (target === 'production') {
      assertRemoteWriteGuard(target);
    }
  } else {
    assertRemoteWriteGuard(target);
  }
  const summary = {
    target,
    runId,
    dryRun,
    propertyName,
    accounts: Object.fromEntries(Object.entries(accounts).map(([key, value]) => [key, value.email])),
    actions: [],
  };

  if (dryRun) {
    summary.actions.push('Validated E2E seed configuration; no Supabase writes performed.');
    printSummary(summary);
    return;
  }

  for (const [key, account] of Object.entries(accounts)) {
    assertAccountMutationAllowed(key, account.email);
  }

  const supabase = getSupabaseClient();
  const users = {};
  for (const [key, account] of Object.entries(accounts)) {
    users[key] = await ensureUser(supabase, account.email, account.password);
    summary.actions.push(`Ensured auth user ${account.email}`);
  }

  const property = await ensureProperty(supabase);
  const nearbyProperty = await ensureNamedProperty(supabase, {
    name: nearbyPropertyName,
    address: '140 QA Nearby Way',
    city: 'Daytona Beach',
    state: 'FL',
    type: 'commercial',
    total_units: 8,
    latitude: 29.2508,
    longitude: -81.0228,
  });
  const outsideProperty = await ensureNamedProperty(supabase, {
    name: outsidePropertyName,
    address: '900 QA Far Way',
    city: 'Orlando',
    state: 'FL',
    type: 'commercial',
    total_units: 6,
    latitude: 28.5383,
    longitude: -81.3792,
  });
  summary.propertyId = property.id;
  summary.nearbyPropertyId = nearbyProperty.id;
  summary.outsidePropertyId = outsideProperty.id;
  summary.actions.push(`Ensured property ${property.name} (${property.id})`);
  summary.actions.push(`Ensured nearby property ${nearbyProperty.name} (${nearbyProperty.id})`);
  summary.actions.push(`Ensured outside-radius property ${outsideProperty.name} (${outsideProperty.id})`);

  await ensureProfiles(supabase, users, property.id);
  summary.actions.push('Ensured tenant/admin profiles and reset-password state');

  await resetQaRows(supabase, [property.id, nearbyProperty.id, outsideProperty.id]);
  summary.actions.push('Removed old QA rows for fixed test properties only');

  await seedBusinesses(supabase, users, property.id);
  await seedPosts(supabase, property.id, nearbyProperty.id, outsideProperty.id);
  await seedNotifications(supabase, users, property.id);
  await seedPricing(supabase);
  await seedAdvertisersAndPromotions(supabase, users, property.id, runId);
  summary.actions.push('Seeded businesses, posts, notifications, pricing, advertisers, and promotions');

  printSummary(summary);
}

function assertAccountMutationAllowed(key, email) {
  if (target !== 'production') return;
  if (email.endsWith('@unit-test.com')) return;
  if (key === 'admin' && process.env.E2E_ALLOW_SHARED_ADMIN_RESET === '1') return;
  throw new Error(`Refusing to reset production ${key} account ${email}. Use a @unit-test.com account or set E2E_ALLOW_SHARED_ADMIN_RESET=1 for the existing Maestro admin identity.`);
}

async function ensureUser(supabase, email, password) {
  const existing = await findUserByEmail(supabase, email);
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { ...(existing.user_metadata ?? {}), qa_e2e: true },
    });
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { qa_e2e: true },
  });
  if (error || !data.user) throw error ?? new Error(`Unable to create ${email}`);
  return data.user;
}

async function findUserByEmail(supabase, email) {
  let page = 1;
  while (page < 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 1000) return null;
    page += 1;
  }
  return null;
}

async function ensureProperty(supabase) {
  return ensureNamedProperty(supabase, {
    name: propertyName,
    address: '100 QA Way',
    city: 'Daytona Beach',
    state: 'FL',
    type: 'commercial',
    total_units: 10,
    latitude: 29.2108,
    longitude: -81.0228,
  });
}

async function ensureNamedProperty(supabase, payload) {
  const { data: existingRows, error: findError } = await supabase
    .from('properties')
    .select('id, name')
    .eq('name', payload.name)
    .limit(1);
  if (findError) throw findError;
  const existing = existingRows?.[0] ?? null;

  if (existing) {
    const { data, error } = await supabase
      .from('properties')
      .update(payload)
      .eq('id', existing.id)
      .select('id, name')
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase.from('properties').insert(payload).select('id, name').single();
  if (error) throw error;
  return data;
}

async function ensureProfiles(supabase, users, propertyId) {
  const profiles = [
    {
      id: users.tenant.id,
      email: accounts.tenant.email,
      role: 'tenant',
      property_ids: [propertyId],
      status: 'active',
      activated_at: new Date().toISOString(),
      needs_password_change: false,
      display_name: 'QA Tenant One',
    },
    {
      id: users.resetTenant.id,
      email: accounts.resetTenant.email,
      role: 'tenant',
      property_ids: [propertyId],
      status: 'active',
      activated_at: new Date().toISOString(),
      needs_password_change: true,
      display_name: 'QA Reset Tenant',
    },
    {
      id: users.admin.id,
      email: accounts.admin.email,
      role: 'landlord',
      property_ids: [propertyId],
      status: 'active',
      activated_at: new Date().toISOString(),
      needs_password_change: false,
      display_name: 'QA Admin',
    },
  ];
  const { error } = await supabase.from('profiles').upsert(profiles, { onConflict: 'id' });
  if (error) throw error;
}

async function resetQaRows(supabase, propertyIds) {
  const { data: promotions } = await supabase
    .from('promotions')
    .select('id')
    .in('property_id', propertyIds)
    .ilike('headline', 'QA E2E%');
  const promotionIds = (promotions ?? []).map((promotion) => promotion.id);
  if (promotionIds.length > 0) {
    await supabase.from('promotion_status_events').delete().in('promotion_id', promotionIds);
    await supabase.from('promotion_payment_attempts').delete().in('promotion_id', promotionIds);
    await supabase.from('promotions').delete().in('id', promotionIds);
  }

  await supabase.from('notifications').delete().in('property_id', propertyIds).ilike('title', 'QA E2E%');
  await supabase.from('posts').delete().in('property_id', propertyIds).ilike('title', 'QA E2E%');
  await supabase.from('businesses').delete().in('property_id', propertyIds).ilike('business_name', 'QA E2E%');
  await supabase
    .from('businesses')
    .delete()
    .in('owner_email', [accounts.tenant.email, accounts.resetTenant.email, 'fitness@unit-test.com']);
}

async function seedBusinesses(supabase, users, propertyId) {
  const rows = [
    {
      property_id: propertyId,
      owner_email: accounts.tenant.email,
      business_name: 'QA E2E Coffee',
      unit_number: 'QA-101',
      category: 'Food',
      business_description: 'Seeded tenant business for E2E testing.',
      contact_name: 'QA Tenant',
      contact_email: accounts.tenant.email,
      contact_phone: '555-0101',
      website: 'https://example.com/coffee',
      is_featured: true,
    },
    {
      property_id: propertyId,
      owner_email: 'fitness@unit-test.com',
      business_name: 'QA E2E Fitness',
      unit_number: 'QA-202',
      category: 'Fitness',
      business_description: 'Second seeded business for directory search.',
      contact_name: 'QA Fitness',
      contact_email: 'fitness@unit-test.com',
      contact_phone: '555-0202',
      website: 'https://example.com/fitness',
      is_featured: false,
    },
  ];
  const { error } = await supabase.from('businesses').insert(rows);
  if (error) throw error;
}

async function seedPosts(supabase, propertyId, nearbyPropertyId, outsidePropertyId) {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const now = Date.now();
  const { error } = await supabase.from('posts').insert([
    {
      property_id: propertyId,
      type: 'announcement',
      title: 'QA E2E Welcome Announcement',
      content: 'Seeded announcement for the automated E2E suite.',
    },
    {
      property_id: propertyId,
      type: 'announcement',
      title: 'QA Nearby Origin Announcement',
      content: 'Origin-property announcement for the 20-mile Nearby E2E suite.',
      created_date: new Date(now + 2 * 60 * 1000).toISOString(),
    },
    {
      property_id: propertyId,
      type: 'event',
      title: 'QA E2E Networking Event',
      content: 'Seeded event for the automated E2E suite.',
      event_date: tomorrow,
      event_time: '10:00 AM',
    },
    {
      property_id: nearbyPropertyId,
      type: 'announcement',
      title: 'QA Nearby Neighbor Announcement',
      content: 'Nearby-property announcement that must appear within the 20-mile Home feed.',
      created_date: new Date(now + 3 * 60 * 1000).toISOString(),
    },
    {
      property_id: nearbyPropertyId,
      type: 'event',
      title: 'QA Nearby Neighbor Event',
      content: 'Nearby-property event that must appear within the 20-mile Home feed.',
      event_date: tomorrow,
      event_time: '11:00 AM',
      created_date: new Date(now + 3 * 60 * 1000 + 1000).toISOString(),
    },
    {
      property_id: outsidePropertyId,
      type: 'announcement',
      title: 'QA Nearby Outside Announcement',
      content: 'Outside-radius announcement that must not appear in the 20-mile Home feed.',
      created_date: new Date(now + 4 * 60 * 1000).toISOString(),
    },
    {
      property_id: outsidePropertyId,
      type: 'event',
      title: 'QA Nearby Outside Event',
      content: 'Outside-radius event that must not appear in the 20-mile Home feed.',
      event_date: tomorrow,
      event_time: '12:00 PM',
      created_date: new Date(now + 4 * 60 * 1000 + 1000).toISOString(),
    },
  ]);
  if (error) throw error;
}

async function seedNotifications(supabase, users, propertyId) {
  const { error } = await supabase.from('notifications').insert({
    user_id: users.tenant.id,
    user_email: accounts.tenant.email,
    property_id: propertyId,
    type: 'post',
    title: 'QA E2E Test Notification',
    message: 'Seeded unread notification for Maestro E2E testing.',
    data: { qa_e2e: true },
    read: false,
  });
  if (error) throw error;
}

async function seedPricing(supabase) {
  for (const tier of [
    { name: 'QA E2E 7-Day Standard', duration_days: 7, price_cents: 2999, is_featured: false, is_active: true },
    { name: 'QA E2E 14-Day Featured', duration_days: 14, price_cents: 4999, is_featured: true, is_active: true },
    { name: 'QA E2E 30-Day Premium', duration_days: 30, price_cents: 9999, is_featured: true, is_active: true },
  ]) {
    const { data: existingRows, error: findError } = await supabase
      .from('promotion_price_tiers')
      .select('id')
      .eq('name', tier.name)
      .limit(1);
    if (findError) throw findError;
    const existing = existingRows?.[0] ?? null;
    const query = existing
      ? supabase.from('promotion_price_tiers').update(tier).eq('id', existing.id)
      : supabase.from('promotion_price_tiers').insert(tier);
    const { error } = await query;
    if (error) throw error;
  }
}

async function seedAdvertisersAndPromotions(supabase, users, propertyId, runId) {
  await supabase.from('advertiser_profiles').upsert({
    id: users.tenant.id,
    business_name: 'QA E2E Coffee',
    contact_email: accounts.tenant.email,
    status: 'active',
  });

  const now = new Date();
  const startDate = now.toISOString().slice(0, 10);
  const endDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const rows = [
    promotionPayload(propertyId, users.tenant.id, 'QA E2E Approved Deal', 'approved', 'paid', startDate, endDate, runId),
    promotionPayload(propertyId, users.tenant.id, 'QA E2E Pending Review 1', 'pending', 'paid', startDate, endDate, runId),
    promotionPayload(propertyId, users.tenant.id, 'QA E2E Pending Review 2', 'pending', 'paid', startDate, endDate, runId),
    promotionPayload(propertyId, users.tenant.id, 'QA E2E Pending Review 3', 'pending', 'paid', startDate, endDate, runId),
    promotionPayload(propertyId, users.tenant.id, 'QA E2E Pending Review 4', 'pending', 'paid', startDate, endDate, runId),
    {
      ...promotionPayload(propertyId, null, 'QA E2E External Local Deal', 'approved', null, startDate, endDate, runId),
      created_by_admin_id: users.admin.id,
      external_contact_name: 'QA External Contact',
      external_contact_email: 'external@unit-test.com',
      external_contact_phone: '555-0303',
    },
  ];
  const { error } = await supabase.from('promotions').insert(rows);
  if (error) throw error;
}

function promotionPayload(propertyId, advertiserId, headline, reviewStatus, paymentStatus, startDate, endDate, runId) {
  return {
    property_id: propertyId,
    advertiser_id: advertiserId,
    business_name: advertiserId ? 'QA E2E Coffee' : 'QA E2E External Business',
    headline,
    description: `Seeded promotion for ${runId}.`,
    image_url: null,
    cta_text: 'Learn More',
    cta_link: 'https://example.com',
    review_status: reviewStatus,
    payment_status: paymentStatus,
    start_date: startDate,
    end_date: endDate,
  };
}

function printSummary(summary) {
  const dir = ensureDir(join(resultsRoot, summary.runId));
  writeJson(join(dir, 'seed-summary.json'), summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(JSON.stringify(error, null, 2));
  }
  process.exit(1);
});
