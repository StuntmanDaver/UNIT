'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Status = 'polling' | 'confirmed' | 'timeout';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<Status>('polling');
  const [promotionId, setPromotionId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) { setStatus('timeout'); return; }

    const supabase = createClient();
    let attempts = 0;
    const MAX_ATTEMPTS = 10; // 10 × 1s = 10 seconds

    const poll = async () => {
      // Find the promotion linked to this checkout session
      const { data: attempt } = await supabase
        .from('promotion_payment_attempts')
        .select('promotion_id, status')
        .eq('stripe_checkout_session_id', sessionId)
        .single();

      if (!attempt) {
        attempts++;
        if (attempts >= MAX_ATTEMPTS) { setStatus('timeout'); return; }
        setTimeout(poll, 1000);
        return;
      }

      setPromotionId(attempt.promotion_id);

      if (attempt.status === 'completed') {
        setStatus('confirmed');
        return;
      }

      attempts++;
      if (attempts >= MAX_ATTEMPTS) { setStatus('timeout'); return; }
      setTimeout(poll, 1000);
    };

    poll();
  }, [sessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 text-center">
        {status === 'polling' && (
          <>
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Confirming your payment...</p>
          </>
        )}
        {status === 'confirmed' && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 text-2xl">✓</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Submitted for review</h1>
            <p className="text-sm text-gray-500 mb-6">
              Admin typically responds within 1–2 business days.
            </p>
            <Link href="/dashboard"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
              Back to Dashboard
            </Link>
          </>
        )}
        {status === 'timeout' && (
          <>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-blue-600 text-2xl">💳</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Payment received</h1>
            <p className="text-sm text-gray-500 mb-6">
              Your promotion is being processed. Check your dashboard for status updates.
            </p>
            <Link href="/dashboard"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
              Back to Dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
