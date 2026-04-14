'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Promotion } from '@/lib/supabase/types';

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

  const handleRepaymentCheckout = async () => {
    setLoading(true);
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promotionId: id, attemptType: 'repayment' }),
    });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    } else {
      toast.error('Unable to start checkout');
      setLoading(false);
    }
  };

  if (review_status === 'pending') {
    return <p className="text-sm text-gray-500 italic">Awaiting admin review</p>;
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
      <button onClick={handleResubmit} disabled={loading}
        className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-600 disabled:opacity-50">
        {loading ? 'Submitting...' : 'Edit & Resubmit'}
      </button>
    );
  }
  if (review_status === 'revision_requested' && payment_status === 'repayment_required') {
    return (
      <button onClick={handleRepaymentCheckout} disabled={loading}
        className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">
        {loading ? 'Loading...' : 'Edit & Pay $49.99 to Resubmit'}
      </button>
    );
  }
  if (review_status === 'draft' && payment_status === 'unpaid') {
    return (
      <button onClick={() => router.push(`/promotions/new/review?id=${id}`)} disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
        Pay & Submit →
      </button>
    );
  }
  if (review_status === 'rejected') {
    return <p className="text-sm text-red-600">Closed</p>;
  }
  return null;
}
