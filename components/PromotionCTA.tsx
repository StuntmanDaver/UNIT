'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Promotion } from '@/lib/supabase/types';
import { getReviewHref } from '@/lib/promotion-display';

type Props = { promotion: Promotion };

export function PromotionCTA({ promotion }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { review_status, payment_status, id } = promotion;

  const today = new Date().toISOString().split('T')[0];
  const isLive =
    review_status === 'approved' &&
    (promotion.start_date ?? '') <= today &&
    (promotion.end_date ?? '') > today;
  const isScheduled =
    review_status === 'approved' && (promotion.start_date ?? '') > today;

  const handleResubmit = async () => {
    setLoading(true);
    const res = await fetch('/api/resubmit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promotionId: id }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success('Resubmitted for review');
      router.refresh();
    } else {
      toast.error('Failed to resubmit');
    }
  };

  if (review_status === 'pending') {
    return <p className="text-sm italic text-[#465A75]">Awaiting admin review</p>;
  }
  if (isScheduled) {
    return <p className="text-sm text-green-600 font-medium">Scheduled — goes live {promotion.start_date}</p>;
  }
  if (isLive) {
    return <p className="text-sm text-green-700 font-semibold">● Live</p>;
  }
  if (review_status === 'suspended') {
    return <p className="text-sm text-orange-600">Suspended by admin</p>;
  }
  if (review_status === 'expired') {
    return <p className="text-sm text-gray-500">Ended</p>;
  }
  if (review_status === 'revision_requested' && payment_status === 'paid') {
    return (
      <button type="button" onClick={handleResubmit} disabled={loading}
        className="unit-btn unit-btn-primary">
        {loading ? 'Submitting…' : 'Edit & Resubmit'}
      </button>
    );
  }
  if (review_status === 'revision_requested' && payment_status === 'repayment_required') {
    return (
      <button type="button" onClick={() => router.push(getReviewHref(id, { repayment: true }))} disabled={loading}
        className="unit-btn unit-btn-primary">
        Choose A Plan To Resubmit
      </button>
    );
  }
  if (review_status === 'draft' && payment_status === 'unpaid') {
    return (
      <button type="button" onClick={() => router.push(getReviewHref(id))} disabled={loading}
        className="unit-btn unit-btn-primary">
        Pay & Submit
      </button>
    );
  }
  if (review_status === 'rejected') {
    return <p className="text-sm text-red-600">Closed</p>;
  }
  return null;
}
