'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { assertAdminPropertyAccess, requireAdminAction } from './auth';
import {
  canReviewPromotion,
  canSuspendPromotion,
  deriveReviewDecision,
  deriveSuspensionDecision,
} from './promotionWorkflow';
import { getAssignedProperties, normalizeHttpUrl, selectedPropertyId, throwIfError } from './shared';
import type { AdminPromotion, AdminPromotionReviewAction, AdminProperty } from './types';

type PromotionReviewActionInput =
  | { promotionId: string; action: 'approve' }
  | { promotionId: string; action: 'allow_revision' | 'require_repayment' | 'reject'; note: string };

type PromotionSuspensionInput = {
  promotionId: string;
};

type PromotionRefundInput = {
  promotionId: string;
  reason: string;
};

type ExternalPromotionInput = {
  propertyId: string;
  businessName: string;
  headline: string;
  description: string;
  imageUrl: string | null;
  ctaText: string;
  ctaLink: string;
  externalContactName: string | null;
  externalContactEmail: string | null;
  externalContactPhone: string | null;
  startDate: string;
  endDate: string;
};

type ExternalPromotionFormInput = ExternalPromotionInput;

export async function getAdminPromotions(params: {
  propertyId?: string | null;
  segment?: string | null;
}): Promise<{ properties: AdminProperty[]; selectedPropertyId: string; promotions: AdminPromotion[] }> {
  const context = await requireAdminAction();
  const properties = await getAssignedProperties(context.propertyIds);
  const propertyId = selectedPropertyId(context.propertyIds, params.propertyId);
  if (!propertyId) return { properties, selectedPropertyId: '', promotions: [] };
  assertAdminPropertyAccess(context, propertyId);

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });
  throwIfError(error);

  let promotions = (data ?? []) as AdminPromotion[];
  switch (params.segment) {
    case 'Pending':
      promotions = promotions.filter((promotion) => promotion.review_status === 'pending');
      break;
    case 'Approved':
      promotions = promotions.filter((promotion) => ['approved', 'suspended'].includes(promotion.review_status));
      break;
    case 'Rejected':
      promotions = promotions.filter((promotion) => ['rejected', 'expired'].includes(promotion.review_status));
      break;
    case 'External':
      promotions = promotions.filter((promotion) => promotion.advertiser_id === null);
      break;
  }

  return { properties, selectedPropertyId: propertyId, promotions };
}

export async function getAdminPromotionDetail(id: string): Promise<{
  promotion: AdminPromotion;
  anomaly: boolean;
}> {
  const context = await requireAdminAction();
  const supabase = createServiceRoleClient();
  const { data: promotion, error } = await supabase.from('promotions').select('*').eq('id', id).single();
  throwIfError(error);
  if (!promotion) throw new Error('Promotion not found');
  assertAdminPropertyAccess(context, promotion.property_id);

  let anomaly = false;
  if (promotion.payment_status === 'paid') {
    const { data: attempts, error: attemptError } = await supabase
      .from('promotion_payment_attempts')
      .select('id')
      .eq('promotion_id', id)
      .eq('status', 'completed')
      .limit(1);
    if (attemptError || (attempts?.length ?? 0) === 0) anomaly = true;
  }

  return { promotion: promotion as AdminPromotion, anomaly };
}

export async function applyPromotionReviewAction(
  promotionId: string,
  action: AdminPromotionReviewAction
): Promise<void> {
  const context = await requireAdminAction();
  const supabase = createServiceRoleClient();
  const { data: promotion, error } = await supabase
    .from('promotions')
    .select('id, property_id, review_status, payment_status')
    .eq('id', promotionId)
    .single();
  throwIfError(error);
  if (!promotion) throw new Error('Promotion not found');
  assertAdminPropertyAccess(context, promotion.property_id);
  if (!canReviewPromotion(promotion)) throw new Error('Promotion is not pending review');

  const decision = deriveReviewDecision(promotion, action, context.user.id, new Date().toISOString());
  const { error: updateError } = await supabase
    .from('promotions')
    .update(decision.update)
    .eq('id', promotionId);
  throwIfError(updateError);

  const { error: eventError } = await supabase.from('promotion_status_events').insert({
    ...decision.event,
    promotion_id: promotionId,
  });
  throwIfError(eventError);
  revalidatePath('/admin/promotions');
  revalidatePath(`/admin/promotions/${promotionId}`);
}

export async function submitPromotionReviewAction(input: PromotionReviewActionInput): Promise<void> {
  if (input.action === 'approve') {
    return applyPromotionReviewAction(input.promotionId, { action: 'approve' });
  }

  return applyPromotionReviewAction(input.promotionId, { action: input.action, note: input.note });
}

export async function togglePromotionSuspendAction(promotionId: string): Promise<void> {
  const context = await requireAdminAction();
  const supabase = createServiceRoleClient();
  const { data: promotion, error } = await supabase
    .from('promotions')
    .select('id, property_id, review_status')
    .eq('id', promotionId)
    .single();
  throwIfError(error);
  if (!promotion) throw new Error('Promotion not found');
  assertAdminPropertyAccess(context, promotion.property_id);
  if (!canSuspendPromotion(promotion)) {
    throw new Error('Promotion cannot be suspended or reinstated');
  }

  const decision = deriveSuspensionDecision(
    { review_status: promotion.review_status as 'approved' | 'suspended' },
    context.user.id,
    new Date().toISOString()
  );
  const { error: updateError } = await supabase
    .from('promotions')
    .update(decision.update)
    .eq('id', promotionId);
  throwIfError(updateError);
  const { error: eventError } = await supabase.from('promotion_status_events').insert({
    ...decision.event,
    promotion_id: promotionId,
  });
  throwIfError(eventError);
  revalidatePath('/admin/promotions');
  revalidatePath(`/admin/promotions/${promotionId}`);
}

export async function submitPromotionSuspensionAction(input: PromotionSuspensionInput): Promise<void> {
  return togglePromotionSuspendAction(input.promotionId);
}

export async function issuePromotionRefundAction(promotionId: string, reason: string): Promise<void> {
  const context = await requireAdminAction();
  const supabase = createServiceRoleClient();
  const { data: promotion, error } = await supabase
    .from('promotions')
    .select('id, property_id')
    .eq('id', promotionId)
    .single();
  throwIfError(error);
  if (!promotion) throw new Error('Promotion not found');
  assertAdminPropertyAccess(context, promotion.property_id);

  const auth = await createServerSupabaseClient();
  const { error: invokeError } = await auth.functions.invoke('issue-refund', {
    body: { promotionId, reason: reason.trim() },
  });
  throwIfError(invokeError);
  revalidatePath('/admin/promotions');
  revalidatePath(`/admin/promotions/${promotionId}`);
}

export async function submitPromotionRefundAction(input: PromotionRefundInput): Promise<void> {
  return issuePromotionRefundAction(input.promotionId, input.reason);
}

export async function createExternalPromotionAction(input: ExternalPromotionInput): Promise<string> {
  const context = await requireAdminAction();
  assertAdminPropertyAccess(context, input.propertyId);
  if (input.endDate <= input.startDate) throw new Error('End date must be after start date');
  const ctaLink = normalizeHttpUrl(input.ctaLink, 'CTA URL');

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('promotions')
    .insert({
      property_id: input.propertyId,
      advertiser_id: null,
      created_by_admin_id: context.user.id,
      business_name: input.businessName.trim(),
      headline: input.headline.trim(),
      description: input.description.trim(),
      image_url: input.imageUrl,
      cta_text: input.ctaText.trim(),
      cta_link: ctaLink,
      external_contact_name: input.externalContactName?.trim() || null,
      external_contact_email: input.externalContactEmail?.trim() || null,
      external_contact_phone: input.externalContactPhone?.trim() || null,
      start_date: input.startDate,
      end_date: input.endDate,
      review_status: 'approved',
      payment_status: null,
    })
    .select('id')
    .single();
  throwIfError(error);
  if (!data) throw new Error('Promotion creation did not return an id');
  revalidatePath('/admin/promotions');
  revalidatePath('/admin');
  return data.id as string;
}

export async function createExternalPromotionFromFormAction(input: ExternalPromotionFormInput): Promise<string> {
  return createExternalPromotionAction(input);
}
