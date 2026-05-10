import type { AdminPromotionReviewAction, Promotion } from '@/services/promotions';

export type PromotionWorkflowSnapshot = Pick<Promotion, 'review_status' | 'payment_status'>;

export type PromotionReviewDecision = {
  update: Partial<Pick<Promotion, 'review_status' | 'payment_status' | 'reviewed_by' | 'reviewed_at' | 'review_note'>>;
  event: {
    from_review_status: Promotion['review_status'];
    to_review_status: Promotion['review_status'];
    from_payment_status: Promotion['payment_status'];
    to_payment_status: Promotion['payment_status'];
    actor_user_id: string;
    actor_type: 'admin';
    note: string | null;
  };
};

export type PromotionSuspensionDecision = {
  update: Partial<Pick<Promotion, 'review_status' | 'reviewed_by' | 'reviewed_at'>>;
  event: {
    from_review_status: 'approved' | 'suspended';
    to_review_status: 'approved' | 'suspended';
    actor_user_id: string;
    actor_type: 'admin';
    note: null;
  };
};

export function canReviewPromotion(snapshot: Pick<Promotion, 'review_status'>): boolean {
  return snapshot.review_status === 'pending';
}

export function canSuspendPromotion(snapshot: Pick<Promotion, 'review_status'>): boolean {
  return snapshot.review_status === 'approved' || snapshot.review_status === 'suspended';
}

export function canRefundPromotion(snapshot: PromotionWorkflowSnapshot): boolean {
  return (
    snapshot.review_status === 'rejected' &&
    (snapshot.payment_status === 'paid' || snapshot.payment_status === 'repayment_required')
  );
}

export function deriveReviewDecision(
  snapshot: PromotionWorkflowSnapshot,
  action: AdminPromotionReviewAction,
  actorUserId: string,
  nowIso: string
): PromotionReviewDecision {
  let reviewStatus: Promotion['review_status'];
  let paymentStatus: Promotion['payment_status'] = snapshot.payment_status;
  let note: string | null = null;

  switch (action.action) {
    case 'approve':
      reviewStatus = 'approved';
      break;
    case 'allow_revision':
      reviewStatus = 'revision_requested';
      note = action.note;
      break;
    case 'require_repayment':
      reviewStatus = 'revision_requested';
      paymentStatus = 'repayment_required';
      note = action.note;
      break;
    case 'reject':
      reviewStatus = 'rejected';
      note = action.note;
      break;
  }

  return {
    update: {
      review_status: reviewStatus,
      payment_status: paymentStatus,
      reviewed_by: actorUserId,
      reviewed_at: nowIso,
      review_note: action.action === 'approve' ? null : note,
    },
    event: {
      from_review_status: snapshot.review_status,
      to_review_status: reviewStatus,
      from_payment_status: snapshot.payment_status,
      to_payment_status: paymentStatus,
      actor_user_id: actorUserId,
      actor_type: 'admin',
      note,
    },
  };
}

export function deriveSuspensionDecision(
  snapshot: Pick<Promotion, 'review_status'> & { review_status: 'approved' | 'suspended' },
  actorUserId: string,
  nowIso: string
): PromotionSuspensionDecision {
  const nextStatus = snapshot.review_status === 'approved' ? 'suspended' : 'approved';

  return {
    update: {
      review_status: nextStatus,
      reviewed_by: actorUserId,
      reviewed_at: nowIso,
    },
    event: {
      from_review_status: snapshot.review_status,
      to_review_status: nextStatus,
      actor_user_id: actorUserId,
      actor_type: 'admin',
      note: null,
    },
  };
}
