import type { ReviewStatus, PaymentStatus } from '@/lib/supabase/types';

const REVIEW_COLORS: Record<ReviewStatus, string> = {
  draft: 'bg-[#F3F4F6] text-[#5F708A]',
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  revision_requested: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-[#F3F4F6] text-[#5F708A]',
  suspended: 'bg-orange-100 text-orange-700',
};

const PAYMENT_COLORS: Record<string, string> = {
  unpaid: 'bg-[#F3F4F6] text-[#5F708A]',
  paid: 'bg-[#E0E1DE] text-[#101B29]',
  repayment_required: 'bg-amber-100 text-amber-700',
  refunded: 'bg-red-100 text-red-500',
};

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span className={`unit-status ${REVIEW_COLORS[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  if (status === null) return null;
  return (
    <span className={`unit-status ${PAYMENT_COLORS[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
