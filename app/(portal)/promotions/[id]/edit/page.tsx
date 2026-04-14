'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { Promotion } from '@/lib/supabase/types';
import { getPromotion, updatePromotion } from '@/app/(portal)/promotions/actions';

const schema = z.object({
  headline: z.string().min(5),
  description: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});
type FormData = z.infer<typeof schema>;

export default function EditPromotionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    getPromotion(id).then((p) => {
      if (!p) return;
      setPromotion(p as Promotion);
      if (!['draft', 'revision_requested'].includes(p.review_status)) {
        router.replace(`/promotions/${id}`);
        return;
      }
      reset({
        headline: p.headline,
        description: p.description ?? '',
        startDate: p.start_date ?? '',
        endDate: p.end_date ?? '',
      });
    });
  }, [id]);

  const onSubmit = async (data: FormData) => {
    if (!promotion) return;
    setLoading(true);
    try {
      await updatePromotion(id, {
        headline: data.headline,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
      });
    } catch {
      toast.error('Failed to save changes');
      setLoading(false);
      return;
    }
    setLoading(false);

    // Navigate based on what action is needed next
    if (promotion.payment_status === 'repayment_required') {
      // Must repay — go to Review & Pay with repayment mode
      router.push(`/promotions/new/review?id=${id}&repayment=true`);
    } else if (promotion.review_status === 'revision_requested' && promotion.payment_status === 'paid') {
      // Free resubmit — call resubmit API
      const res = await fetch('/api/resubmit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promotionId: id }),
      });
      if (res.ok) {
        toast.success('Submitted for review');
        router.push('/dashboard');
      } else {
        toast.error('Failed to submit');
      }
    } else {
      toast.success('Changes saved');
      router.push(`/promotions/${id}`);
    }
  };

  if (!promotion) return <div className="py-20 text-center text-gray-400">Loading...</div>;

  const needsRepayment = promotion.payment_status === 'repayment_required';

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Edit Promotion</h1>
      {promotion.review_note && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <p className="text-xs font-semibold text-amber-700 mb-1">Admin note</p>
          <p className="text-sm text-amber-800">{promotion.review_note}</p>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
          <input {...register('headline')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          {errors.headline && <p className="text-xs text-red-500 mt-1">{errors.headline.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea {...register('description')} rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
            <input {...register('startDate')} type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
            <input {...register('endDate')} type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.push(`/promotions/${id}`)}
            className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-semibold hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Saving...' : needsRepayment ? 'Save & Continue to Payment' : 'Save & Resubmit for Review'}
          </button>
        </div>
      </form>
    </div>
  );
}
