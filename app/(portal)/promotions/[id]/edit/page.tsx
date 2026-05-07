'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PromotionMediaField } from '@/components/PromotionMediaField';
import { normalizeOptionalFormValue, validateCtaPair } from '@/components/promotionForm';
import type { Promotion } from '@/lib/supabase/types';
import { getPromotion, updatePromotion } from '@/app/(portal)/promotions/actions';

const schema = z.object({
  headline: z.string().min(5),
  description: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  ctaText: z.string().optional(),
  ctaLink: z.string().optional(),
}).superRefine((d, ctx) => {
  if (d.endDate <= d.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'End date must be after start date',
      path: ['endDate'],
    });
  }

  const ctaError = validateCtaPair(d);
  if (ctaError) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: ctaError.message,
      path: [ctaError.field],
    });
  }
});
type FormData = z.infer<typeof schema>;

export default function EditPromotionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      ctaText: '',
      ctaLink: '',
    },
  });

  useEffect(() => {
    getPromotion(id).then((p) => {
      if (!p) return;
      setPromotion(p as Promotion);
      if (!['draft', 'revision_requested'].includes(p.review_status)) {
        router.replace(`/promotions/${id}`);
        return;
      }
      setImageUrl(p.image_url ?? null);
      reset({
        headline: p.headline,
        description: p.description ?? '',
        startDate: p.start_date ?? '',
        endDate: p.end_date ?? '',
        ctaText: p.cta_text ?? '',
        ctaLink: p.cta_link ?? '',
      });
    });
  }, [id, reset, router]);

  const onSubmit = async (data: FormData) => {
    if (!promotion) return;
    if (imageUploading) {
      toast.error('Wait for the image upload to finish before saving.');
      return;
    }

    setLoading(true);
    try {
      const promotionUpdates = {
        headline: data.headline,
        description: normalizeOptionalFormValue(data.description) ?? undefined,
        startDate: data.startDate,
        endDate: data.endDate,
        imageUrl,
        ctaText: normalizeOptionalFormValue(data.ctaText),
        ctaLink: normalizeOptionalFormValue(data.ctaLink),
      };
      await updatePromotion(id, promotionUpdates);
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

  if (!promotion) return <div className="unit-loading">Loading…</div>;

  const needsRepayment = promotion.payment_status === 'repayment_required';

  return (
    <div>
      <h1 className="mb-2 text-2xl font-black">Edit Promotion</h1>
      {promotion.review_note && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-700 mb-1">Admin note</p>
          <p className="text-sm text-amber-800">{promotion.review_note}</p>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="unit-card space-y-5 p-6">
        <div>
          <label htmlFor="headline" className="unit-label">Headline</label>
          <input id="headline" {...register('headline')}
            className="unit-input" />
          {errors.headline && <p className="text-xs text-red-500 mt-1">{errors.headline.message}</p>}
        </div>
        <div>
          <label htmlFor="description" className="unit-label">Description</label>
          <textarea id="description" {...register('description')} rows={3}
            className="unit-input min-h-24" />
        </div>
        <PromotionMediaField
          imageUrl={imageUrl}
          onChange={setImageUrl}
          disabled={loading}
          onUploadingChange={setImageUploading}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ctaText" className="unit-label">CTA Text</label>
            <input id="ctaText" {...register('ctaText')}
              placeholder="Book now…"
              autoComplete="off"
              className="unit-input" />
            {errors.ctaText && <p className="text-xs text-red-500 mt-1">{errors.ctaText.message}</p>}
          </div>
          <div>
            <label htmlFor="ctaLink" className="unit-label">CTA URL</label>
            <input id="ctaLink" {...register('ctaLink')}
              placeholder="https://example.com…"
              type="url"
              inputMode="url"
              autoComplete="off"
              className="unit-input" />
            {errors.ctaLink && <p className="text-xs text-red-500 mt-1">{errors.ctaLink.message}</p>}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="startDate" className="unit-label">Start Date</label>
            <input id="startDate" {...register('startDate')} type="date"
              className="unit-input" />
          </div>
          <div>
            <label htmlFor="endDate" className="unit-label">End Date</label>
            <input id="endDate" {...register('endDate')} type="date"
              className="unit-input" />
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <button type="button" onClick={() => router.push(`/promotions/${id}`)}
            className="unit-btn unit-btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={loading || imageUploading}
            className="unit-btn unit-btn-primary flex-1">
            {loading ? 'Saving…' : imageUploading ? 'Uploading Image…' : needsRepayment ? 'Save & Continue To Payment' : 'Save & Resubmit For Review'}
          </button>
        </div>
      </form>
    </div>
  );
}
