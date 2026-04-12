import type { ReviewStatus, PaymentStatus } from '@/lib/supabase/types';

const REVIEW_COLORS: Record<ReviewStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  revision_requested: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
  suspended: 'bg-orange-100 text-orange-700',
};

const PAYMENT_COLORS: Record<string, string> = {
  unpaid: 'bg-gray-100 text-gray-600',
  paid: 'bg-blue-100 text-blue-700',
  repayment_required: 'bg-purple-100 text-purple-700',
  refunded: 'bg-red-100 text-red-500',
};

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${REVIEW_COLORS[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  if (status === null) return null;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_COLORS[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
