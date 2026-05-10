import {
  canRefundPromotion,
  canReviewPromotion,
  canSuspendPromotion,
  deriveReviewDecision,
  deriveSuspensionDecision,
} from '@/lib/promotions/workflow';

const nowIso = '2026-05-10T00:00:00.000Z';

describe('promotion workflow helpers', () => {
  it('derives approve decisions', () => {
    const decision = deriveReviewDecision(
      { review_status: 'pending', payment_status: 'paid' },
      { action: 'approve' },
      'admin-1',
      nowIso
    );

    expect(decision.update).toEqual({
      review_status: 'approved',
      payment_status: 'paid',
      reviewed_by: 'admin-1',
      reviewed_at: nowIso,
      review_note: null,
    });
    expect(decision.event).toEqual({
      from_review_status: 'pending',
      to_review_status: 'approved',
      from_payment_status: 'paid',
      to_payment_status: 'paid',
      actor_user_id: 'admin-1',
      actor_type: 'admin',
      note: null,
    });
  });

  it('derives revision, repayment, and reject decisions with notes', () => {
    expect(
      deriveReviewDecision(
        { review_status: 'pending', payment_status: 'paid' },
        { action: 'allow_revision', note: 'Update image' },
        'admin-1',
        nowIso
      ).update
    ).toEqual(expect.objectContaining({ review_status: 'revision_requested', payment_status: 'paid', review_note: 'Update image' }));

    expect(
      deriveReviewDecision(
        { review_status: 'pending', payment_status: 'paid' },
        { action: 'require_repayment', note: 'Material changes' },
        'admin-1',
        nowIso
      ).update
    ).toEqual(expect.objectContaining({ review_status: 'revision_requested', payment_status: 'repayment_required', review_note: 'Material changes' }));

    expect(
      deriveReviewDecision(
        { review_status: 'pending', payment_status: 'paid' },
        { action: 'reject', note: 'Rejected' },
        'admin-1',
        nowIso
      ).event
    ).toEqual(expect.objectContaining({ to_review_status: 'rejected', note: 'Rejected' }));
  });

  it('derives suspend and reinstate decisions', () => {
    expect(deriveSuspensionDecision({ review_status: 'approved' }, 'admin-1', nowIso).update).toEqual({
      review_status: 'suspended',
      reviewed_by: 'admin-1',
      reviewed_at: nowIso,
    });
    expect(deriveSuspensionDecision({ review_status: 'suspended' }, 'admin-1', nowIso).event).toEqual({
      from_review_status: 'suspended',
      to_review_status: 'approved',
      actor_user_id: 'admin-1',
      actor_type: 'admin',
      note: null,
    });
  });

  it('reports review, suspension, and refund eligibility', () => {
    expect(canReviewPromotion({ review_status: 'pending' })).toBe(true);
    expect(canReviewPromotion({ review_status: 'approved' })).toBe(false);
    expect(canSuspendPromotion({ review_status: 'approved' })).toBe(true);
    expect(canSuspendPromotion({ review_status: 'suspended' })).toBe(true);
    expect(canSuspendPromotion({ review_status: 'pending' })).toBe(false);
    expect(canRefundPromotion({ review_status: 'rejected', payment_status: 'paid' })).toBe(true);
    expect(canRefundPromotion({ review_status: 'rejected', payment_status: 'repayment_required' })).toBe(true);
    expect(canRefundPromotion({ review_status: 'rejected', payment_status: 'unpaid' })).toBe(false);
    expect(canRefundPromotion({ review_status: 'approved', payment_status: 'paid' })).toBe(false);
  });
});
