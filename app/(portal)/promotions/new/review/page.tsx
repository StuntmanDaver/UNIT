'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Promotion, PromotionPriceTier } from '@/lib/supabase/types';
import { getPromotion } from '@/app/(portal)/promotions/actions';
import { getActivePromotionPriceTiers } from '@/app/(portal)/promotions/new/review/actions';
import { PromotionPreview } from '@/components/PromotionPreview';
import { formatDuration, formatPrice } from '@/lib/promotion-display';

export default function ReviewAndPayPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const promotionId = searchParams.get('id');
  const wasCanceled = searchParams.get('canceled') === 'true';
  const isRepayment = searchParams.get('repayment') === 'true';

  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [priceTiers, setPriceTiers] = useState<PromotionPriceTier[]>([]);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadReviewData(): Promise<void> {
      if (!promotionId) {
        router.push('/dashboard');
        return;
      }

      try {
        const [promotionData, tiers] = await Promise.all([
          getPromotion(promotionId),
          getActivePromotionPriceTiers(),
        ]);

        if (ignore) {
          return;
        }

        if (!promotionData) {
          toast.error('Promotion not found');
          setLoadError('Promotion not found');
          router.push('/dashboard');
          return;
        }

        setPromotion(promotionData as Promotion);
        setPriceTiers(tiers);
      } catch (error: unknown) {
        if (!ignore) {
          const message = error instanceof Error ? error.message : 'Unable to load review details';
          setLoadError(message);
          toast.error(message);
        }
      } finally {
        if (!ignore) {
          setLoadingPage(false);
        }
      }
    }

    loadReviewData();

    return () => {
      ignore = true;
    };
  }, [promotionId, router]);

  const selectedTier = useMemo(
    () => priceTiers.find((tier) => tier.id === selectedTierId) ?? null,
    [priceTiers, selectedTierId]
  );

  if (loadingPage) {
    return <div className="py-20 text-center text-gray-400">Loading...</div>;
  }

  if (!promotion) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-gray-500">{loadError ?? 'Unable to load review details'}</p>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const handlePay = async () => {
    if (!selectedTier) {
      toast.error('Choose a placement plan before continuing');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promotionId: promotion.id, priceTierId: selectedTier.id }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? 'Unable to start checkout');
      }
      window.location.href = body.url;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Checkout failed';
      toast.error(msg);
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Review & Pay</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isRepayment ? 'Choose a placement plan to resubmit' : 'Step 2 of 2'}
        </p>
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
        <PromotionPreview promotion={promotion} />
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

        <div className="border-t border-gray-100 pt-4">
          <div className="mb-3">
            <p className="text-base font-semibold text-gray-800">Placement plan</p>
            <p className="text-sm text-gray-500">Select an active plan before continuing to Stripe.</p>
          </div>

          {priceTiers.length === 0 ? (
            <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              No active placement plans are available. Please contact support.
            </div>
          ) : (
            <div className="grid gap-3">
              {priceTiers.map((tier) => {
                const isSelected = selectedTierId === tier.id;

                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedTierId(tier.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-gray-900">{tier.name}</span>
                          {tier.is_featured && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                              Featured
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          Runs for {formatDuration(tier.duration_days)}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-blue-700">
                        {formatPrice(tier)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={() => router.back()}
            className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-semibold hover:bg-gray-50">
            ← Back
          </button>
          <button onClick={handlePay} disabled={submitting || !selectedTier || priceTiers.length === 0}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {submitting
              ? 'Redirecting to Stripe...'
              : selectedTier
                ? `Pay ${formatPrice(selectedTier)} with Stripe`
                : 'Choose a plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
