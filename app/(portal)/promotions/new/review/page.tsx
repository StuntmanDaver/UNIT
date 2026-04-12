'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { Promotion } from '@/lib/supabase/types';

const PLACEMENT_FEE_CENTS = 4999;

export default function ReviewAndPayPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const promotionId = searchParams.get('id');
  const wasCanceled = searchParams.get('canceled') === 'true';
  const isRepayment = searchParams.get('repayment') === 'true';

  const supabase = createClient();
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!promotionId) { router.push('/dashboard'); return; }
    supabase
      .from('promotions')
      .select('*')
      .eq('id', promotionId)
      .single()
      .then(({ data }) => setPromotion(data as Promotion));
  }, [promotionId]);

  if (!promotion) {
    return <div className="py-20 text-center text-gray-400">Loading...</div>;
  }

  const handlePay = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promotionId: promotion.id, attemptType: isRepayment ? 'repayment' : 'initial' }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? 'Unable to start checkout');
      }
      window.location.href = body.url;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Checkout failed';
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Review & Pay</h1>
        <p className="text-sm text-gray-500 mt-1">Step 2 of 2</p>
      </div>

      {wasCanceled && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          Payment not completed. Your draft was saved. No charge was made.
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Headline</p>
          <p className="font-semibold text-gray-900">{promotion.headline}</p>
        </div>
        {promotion.description && (
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Description</p>
            <p className="text-sm text-gray-700">{promotion.description}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Start date</p>
            <p className="text-sm font-medium text-gray-900">{promotion.start_date}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">End date</p>
            <p className="text-sm font-medium text-gray-900">{promotion.end_date}</p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
          <span className="text-base font-semibold text-gray-700">Placement fee</span>
          <span className="text-xl font-bold text-blue-700">
            ${(PLACEMENT_FEE_CENTS / 100).toFixed(2)}
          </span>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={() => router.back()}
            className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-semibold hover:bg-gray-50">
            ← Back
          </button>
          <button onClick={handlePay} disabled={loading}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Redirecting to Stripe...' : `Pay $${(PLACEMENT_FEE_CENTS / 100).toFixed(2)} with Stripe`}
          </button>
        </div>
      </div>
    </div>
  );
}
