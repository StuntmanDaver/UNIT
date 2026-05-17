import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type QaSeed = {
  qaRunId: string;
  propertyId: string;
  admin: { id: string; email: string; password: string };
  advertiser: { id: string; email: string; password: string };
  activeAdvertiser: { id: string; email: string; password: string };
  tenant: { id: string; email: string; password: string };
  promotionIds: {
    pending: string;
    approvedRecent: string;
    approvedOld: string;
    rejected: string;
    external: string;
  };
  priceTierId: string;
};

type CreatedAuthUser = {
  id: string;
  email: string;
  password: string;
};

function env(name: string): string {
  loadLocalEnv();
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for full QA E2E`);
  return value;
}

let localEnvLoaded = false;
function loadLocalEnv(): void {
  if (localEnvLoaded) return;
  localEnvLoaded = true;
  for (const file of ['.env.local', '.env.production.local']) {
    const path = join(process.cwd(), file);
    if (!existsSync(path)) continue;
    const lines = readFileSync(path, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      if (process.env[key]) continue;
      process.env[key] = rawValue.replace(/^["']|["']$/g, '');
    }
  }
}

function serviceClient(): SupabaseClient {
  return createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function createAuthUser(supabase: SupabaseClient, qaRunId: string, prefix: string): Promise<CreatedAuthUser> {
  const email = `${prefix}+${qaRunId}@unit-e2e.test`;
  const password = `UnitQa!${qaRunId.slice(-10)}`;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { qa_run_id: qaRunId },
  });
  if (error || !data.user) throw error ?? new Error(`Unable to create ${prefix} auth user`);
  return { id: data.user.id, email, password };
}

export async function seedQaData(): Promise<QaSeed> {
  const supabase = serviceClient();
  const qaRunId = `qa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const [admin, advertiser, activeAdvertiser, tenant] = await Promise.all([
    createAuthUser(supabase, qaRunId, 'admin'),
    createAuthUser(supabase, qaRunId, 'advertiser'),
    createAuthUser(supabase, qaRunId, 'active-advertiser'),
    createAuthUser(supabase, qaRunId, 'tenant'),
  ]);

  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .insert({
      name: `QA Property ${qaRunId}`,
      address: '100 QA Way',
      city: 'Testville',
      state: 'CA',
      type: 'commercial',
      total_units: 3,
      image_url: null,
    })
    .select('id')
    .single();
  if (propertyError || !property) throw propertyError ?? new Error('Unable to seed property');

  await supabase.from('profiles').upsert([
    {
      id: admin.id,
      role: 'landlord',
      property_ids: [property.id],
      email: admin.email,
      status: 'active',
      activated_at: new Date().toISOString(),
    },
    {
      id: tenant.id,
      role: 'tenant',
      property_ids: [property.id],
      email: tenant.email,
      status: 'active',
      activated_at: new Date().toISOString(),
    },
  ]);

  await supabase.from('businesses').insert({
    property_id: property.id,
    owner_email: tenant.email,
    business_name: `QA Tenant Business ${qaRunId}`,
    category: 'Food',
    contact_name: 'QA Tenant',
    contact_phone: '555-0100',
    business_description: 'Seeded tenant business for admin E2E.',
    unit_number: 'QA-1',
  });

  await supabase.from('advertiser_profiles').insert({
    id: advertiser.id,
    business_name: `QA Advertiser ${qaRunId}`,
    contact_email: advertiser.email,
    status: 'pending',
  });

  await supabase.from('advertiser_profiles').insert({
    id: activeAdvertiser.id,
    business_name: `QA Active Advertiser ${qaRunId}`,
    contact_email: activeAdvertiser.email,
    status: 'active',
  });

  const { data: tier, error: tierError } = await supabase
    .from('promotion_price_tiers')
    .insert({
      name: `QA Tier ${qaRunId}`,
      duration_days: 7,
      is_featured: false,
      price_cents: 1234,
      currency: 'usd',
      is_active: true,
    })
    .select('id')
    .single();
  if (tierError || !tier) throw tierError ?? new Error('Unable to seed price tier');

  const recent = new Date().toISOString();
  const old = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
  const { data: promotions, error: promotionsError } = await supabase
    .from('promotions')
    .insert([
      promotionPayload({ qaRunId, propertyId: property.id, advertiserId: advertiser.id, headline: 'QA Pending Review', reviewStatus: 'pending', paymentStatus: 'paid', createdAt: recent }),
      promotionPayload({ qaRunId, propertyId: property.id, advertiserId: advertiser.id, headline: 'QA Recent Approved', reviewStatus: 'approved', paymentStatus: 'paid', createdAt: recent }),
      promotionPayload({ qaRunId, propertyId: property.id, advertiserId: advertiser.id, headline: 'QA Old Approved', reviewStatus: 'approved', paymentStatus: 'paid', createdAt: old }),
      promotionPayload({ qaRunId, propertyId: property.id, advertiserId: advertiser.id, headline: 'QA Rejected Refund', reviewStatus: 'rejected', paymentStatus: 'paid', createdAt: recent }),
      promotionPayload({ qaRunId, propertyId: property.id, advertiserId: null, adminId: admin.id, headline: 'QA External Approved', reviewStatus: 'approved', paymentStatus: null, createdAt: recent }),
    ])
    .select('id, headline');
  if (promotionsError || !promotions) throw promotionsError ?? new Error('Unable to seed promotions');

  const promotionId = (headline: string): string => {
    const row = promotions.find((promotion) => promotion.headline === `${headline} ${qaRunId}`);
    if (!row) throw new Error(`Missing seeded promotion ${headline}`);
    return row.id as string;
  };

  await supabase.from('promotion_payment_attempts').insert({
    promotion_id: promotionId('QA Pending Review'),
    price_tier_id: tier.id,
    stripe_checkout_session_id: `cs_${qaRunId}`,
    amount_cents: 1234,
    status: 'completed',
    attempt_type: 'initial',
  });

  await supabase.from('notifications').insert({
    user_id: tenant.id,
    user_email: tenant.email,
    property_id: property.id,
    type: 'broadcast',
    title: `QA Broadcast ${qaRunId}`,
    message: 'Seeded broadcast history item.',
    data: { qa_run_id: qaRunId },
    read: false,
  });

  return {
    qaRunId,
    propertyId: property.id as string,
    admin,
    advertiser,
    activeAdvertiser,
    tenant,
    promotionIds: {
      pending: promotionId('QA Pending Review'),
      approvedRecent: promotionId('QA Recent Approved'),
      approvedOld: promotionId('QA Old Approved'),
      rejected: promotionId('QA Rejected Refund'),
      external: promotionId('QA External Approved'),
    },
    priceTierId: tier.id as string,
  };
}

function promotionPayload(input: {
  qaRunId: string;
  propertyId: string;
  advertiserId: string | null;
  adminId?: string;
  headline: string;
  reviewStatus: string;
  paymentStatus: string | null;
  createdAt: string;
}): Record<string, unknown> {
  return {
    property_id: input.propertyId,
    advertiser_id: input.advertiserId,
    created_by_admin_id: input.advertiserId === null ? input.adminId : null,
    business_name: input.advertiserId === null ? `QA External Business ${input.qaRunId}` : `QA Advertiser ${input.qaRunId}`,
    headline: `${input.headline} ${input.qaRunId}`,
    description: `Seeded promotion for ${input.qaRunId}`,
    image_url: null,
    cta_text: 'Learn More',
    cta_link: 'https://example.com',
    external_contact_name: input.advertiserId === null ? 'QA External Contact' : null,
    external_contact_email: input.advertiserId === null ? `external+${input.qaRunId}@unit-e2e.test` : null,
    external_contact_phone: input.advertiserId === null ? '555-0199' : null,
    review_status: input.reviewStatus,
    payment_status: input.paymentStatus,
    start_date: '2026-05-08',
    end_date: '2026-05-15',
    created_at: input.createdAt,
  };
}

export async function cleanupQaData(seed: QaSeed | null): Promise<void> {
  if (!seed) return;
  const supabase = serviceClient();
  const { data: qaPromotions } = await supabase
    .from('promotions')
    .select('id')
    .eq('property_id', seed.propertyId);
  const promotionIds = Array.from(new Set([
    ...Object.values(seed.promotionIds),
    ...((qaPromotions ?? []).map((promotion) => promotion.id as string)),
  ]));
  await supabase.from('promotion_status_events').delete().in('promotion_id', promotionIds);
  await supabase.from('promotion_payment_attempts').delete().in('promotion_id', promotionIds);
  await supabase.from('promotions').delete().in('id', promotionIds);
  await supabase.from('notifications').delete().eq('property_id', seed.propertyId);
  await supabase.from('businesses').delete().eq('property_id', seed.propertyId);
  await supabase.from('promotion_price_tiers').delete().eq('id', seed.priceTierId);
  await supabase.from('advertiser_profiles').delete().in('id', [seed.advertiser.id, seed.activeAdvertiser.id]);
  await supabase.from('profiles').delete().in('id', [seed.admin.id, seed.tenant.id]);
  await supabase.from('properties').delete().eq('id', seed.propertyId);
  await Promise.allSettled([
    supabase.auth.admin.deleteUser(seed.admin.id),
    supabase.auth.admin.deleteUser(seed.advertiser.id),
    supabase.auth.admin.deleteUser(seed.activeAdvertiser.id),
    supabase.auth.admin.deleteUser(seed.tenant.id),
  ]);
}
