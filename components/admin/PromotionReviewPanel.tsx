'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PaymentStatusBadge, ReviewStatusBadge } from '@/components/StatusBadges';
import { PromotionPreview } from '@/components/PromotionPreview';
import { canRefundPromotion, canReviewPromotion, canSuspendPromotion } from '@/lib/admin/promotionWorkflow';
import type { PaymentStatus, ReviewStatus } from '@/lib/supabase/types';

export type AdminPromotion = {
  id: string;
  property_id: string;
  advertiser_id: string | null;
  created_by_admin_id?: string | null;
  business_name: string;
  headline: string;
  description: string | null;
  image_url: string | null;
  cta_link: string | null;
  cta_text: string | null;
  review_status: ReviewStatus;
  payment_status: PaymentStatus;
  review_note: string | null;
  refund_reason?: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

export type AdminPromotionReviewActionPayload =
  | { promotionId: string; action: 'approve' }
  | { promotionId: string; action: 'allow_revision' | 'require_repayment' | 'reject'; note: string };

export type AdminPromotionSuspensionPayload = {
  promotionId: string;
  nextStatus: 'approved' | 'suspended';
};

export type AdminPromotionRefundPayload = {
  promotionId: string;
  reason: string;
};

type NoteAction = Extract<
  AdminPromotionReviewActionPayload['action'],
  'allow_revision' | 'require_repayment' | 'reject'
>;

type Props = {
  promotion: AdminPromotion;
  paymentAnomaly?: boolean;
  onReviewAction?: (payload: AdminPromotionReviewActionPayload) => Promise<void> | void;
  onToggleSuspension?: (payload: AdminPromotionSuspensionPayload) => Promise<void> | void;
  onIssueRefund?: (payload: AdminPromotionRefundPayload) => Promise<void> | void;
  disabled?: boolean;
};

const NOTE_ACTION_LABELS: Record<NoteAction, string> = {
  allow_revision: 'Allow Revision',
  require_repayment: 'Require Repayment',
  reject: 'Reject Promotion',
};

function formatDateRange(promotion: AdminPromotion): string {
  if (!promotion.start_date && !promotion.end_date) return 'No dates set';
  if (!promotion.start_date) return `Ends ${promotion.end_date}`;
  if (!promotion.end_date) return `Starts ${promotion.start_date}`;
  return `${promotion.start_date} to ${promotion.end_date}`;
}

function isExternalPromotion(promotion: AdminPromotion): boolean {
  return promotion.advertiser_id === null || Boolean(promotion.created_by_admin_id);
}

export function PromotionReviewPanel({
  promotion,
  paymentAnomaly = false,
  onReviewAction,
  onToggleSuspension,
  onIssueRefund,
  disabled = false,
}: Props) {
  const router = useRouter();
  const [noteAction, setNoteAction] = useState<NoteAction | null>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundError, setRefundError] = useState('');
  const [busy, setBusy] = useState(false);

  const canReview = canReviewPromotion(promotion) && Boolean(onReviewAction);
  const canSuspend = canSuspendPromotion(promotion) && Boolean(onToggleSuspension);
  const canRefund = canRefundPromotion(promotion) && Boolean(onIssueRefund);

  const statusSummary = useMemo(
    () => [
      { label: 'Business', value: promotion.business_name },
      { label: 'Run Dates', value: formatDateRange(promotion) },
      { label: 'Source', value: isExternalPromotion(promotion) ? 'External' : 'Tenant' },
    ],
    [promotion]
  );

  const closeNoteDialog = () => {
    setNoteAction(null);
    setNote('');
    setNoteError('');
  };

  const submitApprove = async () => {
    if (!onReviewAction) return;
    setBusy(true);
    try {
      await onReviewAction({ promotionId: promotion.id, action: 'approve' });
      toast.success('Promotion approved');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not approve promotion');
    } finally {
      setBusy(false);
    }
  };

  const submitNoteAction = async () => {
    if (!noteAction || !onReviewAction) return;
    const trimmedNote = note.trim();
    if (!trimmedNote) {
      setNoteError('A note is required');
      return;
    }

    setBusy(true);
    try {
      await onReviewAction({ promotionId: promotion.id, action: noteAction, note: trimmedNote });
      closeNoteDialog();
      toast.success('Promotion updated');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update promotion');
    } finally {
      setBusy(false);
    }
  };

  const submitToggleSuspension = async () => {
    if (!onToggleSuspension) return;
    setBusy(true);
    try {
      await onToggleSuspension({
        promotionId: promotion.id,
        nextStatus: promotion.review_status === 'approved' ? 'suspended' : 'approved',
      });
      toast.success(promotion.review_status === 'approved' ? 'Promotion suspended' : 'Promotion reinstated');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update promotion status');
    } finally {
      setBusy(false);
    }
  };

  const closeRefundDialog = () => {
    setRefundOpen(false);
    setRefundReason('');
    setRefundError('');
  };

  const submitRefund = async () => {
    if (!onIssueRefund) return;
    const trimmedReason = refundReason.trim();
    if (!trimmedReason) {
      setRefundError('A refund reason is required');
      return;
    }

    setBusy(true);
    try {
      await onIssueRefund({ promotionId: promotion.id, reason: trimmedReason });
      closeRefundDialog();
      toast.success('Refund issued');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not issue refund');
    } finally {
      setBusy(false);
    }
  };

  const buttonDisabled = disabled || busy;

  return (
    <section className="space-y-4">
      {paymentAnomaly && (
        <div
          role="alert"
          className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-800"
        >
          No completed payment record found. Verify payment before approving this promotion.
        </div>
      )}

      <div className="unit-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#465A75]">{promotion.business_name}</p>
            <h2 className="mt-1 text-xl font-bold leading-tight text-[#101B29]">{promotion.headline}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <ReviewStatusBadge status={promotion.review_status} />
            <PaymentStatusBadge status={promotion.payment_status} />
            {isExternalPromotion(promotion) && (
              <span className="unit-status bg-[#465A75] text-white">External</span>
            )}
          </div>
        </div>

        {promotion.description && (
          <p className="mt-3 text-sm leading-6 text-[#101B29]">{promotion.description}</p>
        )}

        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          {statusSummary.map((item) => (
            <div key={item.label} className="rounded-lg border border-[#E5E7EB] bg-[#F4F5F7] p-3">
              <dt className="text-xs font-bold uppercase text-[#465A75]">{item.label}</dt>
              <dd className="mt-1 text-sm font-semibold text-[#101B29]">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <PromotionPreview promotion={promotion} />

      {promotion.review_note && (
        <div className="rounded-lg border border-[#465A75]/30 bg-white p-4">
          <h3 className="text-sm font-bold text-[#101B29]">Admin Note</h3>
          <p className="mt-2 text-sm leading-6 text-[#465A75]">{promotion.review_note}</p>
        </div>
      )}

      {(canReview || canSuspend || canRefund) && (
        <div className="unit-card p-4">
          <h3 className="text-base font-bold text-[#101B29]">Actions</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {canReview && (
              <>
                <button
                  type="button"
                  className="unit-btn unit-btn-primary"
                  onClick={submitApprove}
                  disabled={buttonDisabled}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="unit-btn unit-btn-secondary"
                  onClick={() => setNoteAction('allow_revision')}
                  disabled={buttonDisabled}
                >
                  Allow Revision
                </button>
                <button
                  type="button"
                  className="unit-btn unit-btn-secondary"
                  onClick={() => setNoteAction('require_repayment')}
                  disabled={buttonDisabled}
                >
                  Require Repayment
                </button>
                <button
                  type="button"
                  className="unit-btn unit-btn-danger"
                  onClick={() => setNoteAction('reject')}
                  disabled={buttonDisabled}
                >
                  Reject
                </button>
              </>
            )}

            {canSuspend && (
              <button
                type="button"
                className="unit-btn unit-btn-secondary"
                onClick={submitToggleSuspension}
                disabled={buttonDisabled}
              >
                {promotion.review_status === 'approved' ? 'Suspend' : 'Reinstate'}
              </button>
            )}

            {canRefund && (
              <button
                type="button"
                className="unit-btn unit-btn-danger"
                onClick={() => setRefundOpen(true)}
                disabled={buttonDisabled}
              >
                Issue Refund
              </button>
            )}
          </div>
        </div>
      )}

      {noteAction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="promotion-review-dialog-title"
          className="fixed inset-0 z-50 flex items-end bg-black/30 p-4 sm:items-center sm:justify-center"
        >
          <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl">
            <h3 id="promotion-review-dialog-title" className="text-lg font-bold text-[#101B29]">
              {NOTE_ACTION_LABELS[noteAction]}
            </h3>
            <p className="mt-2 text-sm text-[#465A75]">
              Add a note for the advertiser explaining the decision.
            </p>
            <label htmlFor="admin-review-note" className="unit-label mt-4">
              Admin Note
            </label>
            <textarea
              id="admin-review-note"
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
                setNoteError('');
              }}
              className="unit-input min-h-28"
              disabled={buttonDisabled}
            />
            {noteError && <p className="mt-2 text-sm font-semibold text-red-600">{noteError}</p>}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="unit-btn unit-btn-secondary"
                onClick={closeNoteDialog}
                disabled={buttonDisabled}
              >
                Cancel
              </button>
              <button
                type="button"
                className="unit-btn unit-btn-primary"
                onClick={submitNoteAction}
                disabled={buttonDisabled}
              >
                Submit Action
              </button>
            </div>
          </div>
        </div>
      )}

      {refundOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="promotion-refund-dialog-title"
          className="fixed inset-0 z-50 flex items-end bg-black/30 p-4 sm:items-center sm:justify-center"
        >
          <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl">
            <h3 id="promotion-refund-dialog-title" className="text-lg font-bold text-[#101B29]">
              Issue Refund
            </h3>
            <p className="mt-2 text-sm text-[#465A75]">
              Provide the refund reason to store with the promotion record.
            </p>
            <label htmlFor="promotion-refund-reason" className="unit-label mt-4">
              Refund Reason
            </label>
            <textarea
              id="promotion-refund-reason"
              value={refundReason}
              onChange={(event) => {
                setRefundReason(event.target.value);
                setRefundError('');
              }}
              className="unit-input min-h-28"
              disabled={buttonDisabled}
            />
            {refundError && <p className="mt-2 text-sm font-semibold text-red-600">{refundError}</p>}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="unit-btn unit-btn-secondary"
                onClick={closeRefundDialog}
                disabled={buttonDisabled}
              >
                Cancel
              </button>
              <button
                type="button"
                className="unit-btn unit-btn-danger"
                onClick={submitRefund}
                disabled={buttonDisabled}
              >
                Submit Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
