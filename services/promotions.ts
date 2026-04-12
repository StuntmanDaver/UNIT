// services/promotions.ts
import { supabase } from './supabase';

export type Promotion = {
  id: string;
  property_id: string;
  advertiser_id: string | null;
  business_name: string;
  business_type: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  headline: string;
  description: string | null;
  image_url: string | null;
  cta_link: string | null;
  cta_text: string | null;
  // M4 fields
  payment_status: 'unpaid' | 'paid' | 'repayment_required' | 'refunded' | null;
  review_status:
    | 'draft'
    | 'pending'
    | 'approved'
    | 'revision_requested'
    | 'rejected'
    | 'expired'
    | 'suspended';
  current_payment_intent_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  refund_reason: string | null;
  refunded_at: string | null;
  refunded_by: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  // Legacy column — retained but not written to after M4
  approval_status: 'pending' | 'approved' | 'rejected' | null;
};

export type AdminPromotionReviewAction =
  | { action: 'approve' }
  | { action: 'allow_revision'; note: string }
  | { action: 'require_repayment'; note: string }
  | { action: 'reject'; note: string };

export const promotionsService = {
  /** Admin: list promotions for a property filtered by review_status values */
  async getAdminList(
    propertyId: string,
    reviewStatuses: Promotion['review_status'][]
  ): Promise<Promotion[]> {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('property_id', propertyId)
      .in('review_status', reviewStatuses)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  /** Admin: get a single promotion by id */
  async getById(id: string): Promise<Promotion> {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  /** Admin: apply a review action (approve / allow_revision / require_repayment / reject) */
  async applyReviewAction(
    promotionId: string,
    adminUserId: string,
    currentPromotion: Pick<Promotion, 'review_status' | 'payment_status'>,
    action: AdminPromotionReviewAction
  ): Promise<void> {
    const now = new Date().toISOString();

    let newReviewStatus: Promotion['review_status'];
    let newPaymentStatus: Promotion['payment_status'] = currentPromotion.payment_status;
    let note: string | null = null;

    switch (action.action) {
      case 'approve':
        newReviewStatus = 'approved';
        break;
      case 'allow_revision':
        newReviewStatus = 'revision_requested';
        note = action.note;
        break;
      case 'require_repayment':
        newReviewStatus = 'revision_requested';
        newPaymentStatus = 'repayment_required';
        note = action.note;
        break;
      case 'reject':
        newReviewStatus = 'rejected';
        note = action.note;
        break;
    }

    const updatePayload: Partial<Promotion> = {
      review_status: newReviewStatus,
      payment_status: newPaymentStatus,
      reviewed_by: adminUserId,
      reviewed_at: now,
      review_note: action.action === 'approve' ? null : note,
    };

    const { error: updateError } = await supabase
      .from('promotions')
      .update(updatePayload)
      .eq('id', promotionId);
    if (updateError) throw updateError;

    const { error: eventError } = await supabase
      .from('promotion_status_events')
      .insert({
        promotion_id: promotionId,
        from_review_status: currentPromotion.review_status,
        to_review_status: newReviewStatus,
        from_payment_status: currentPromotion.payment_status,
        to_payment_status: newPaymentStatus,
        actor_user_id: adminUserId,
        actor_type: 'admin',
        note,
      });
    if (eventError) throw eventError;
  },

  /** Admin: toggle suspend / reinstate on an approved/suspended promotion */
  async toggleSuspend(
    promotionId: string,
    adminUserId: string,
    currentStatus: 'approved' | 'suspended'
  ): Promise<void> {
    const newStatus = currentStatus === 'approved' ? 'suspended' : 'approved';
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('promotions')
      .update({ review_status: newStatus, reviewed_by: adminUserId, reviewed_at: now })
      .eq('id', promotionId);
    if (updateError) throw updateError;

    const { error: eventError } = await supabase
      .from('promotion_status_events')
      .insert({
        promotion_id: promotionId,
        from_review_status: currentStatus,
        to_review_status: newStatus,
        actor_user_id: adminUserId,
        actor_type: 'admin',
        note: null,
      });
    if (eventError) throw eventError;
  },

  /** Tenant: fetch live promotions for a property (approved + date range) */
  async getLiveForProperty(propertyId: string): Promise<Promotion[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('property_id', propertyId)
      .eq('review_status', 'approved')
      .lte('start_date', today)
      .gt('end_date', today)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  /** Check anomaly: payment_status = paid but no completed attempt row exists */
  async hasCompletedPaymentAttempt(promotionId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('promotion_payment_attempts')
      .select('id')
      .eq('promotion_id', promotionId)
      .eq('status', 'completed')
      .limit(1);
    if (error) return false;
    return (data?.length ?? 0) > 0;
  },
};
