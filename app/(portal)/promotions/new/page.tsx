'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PromotionMediaField } from '@/components/PromotionMediaField';
import { normalizeOptionalFormValue, validateCtaPair } from '@/components/promotionForm';
import { createPromotion, getProperties } from './actions';

const schema = z.object({
  headline: z.string().min(5, 'Headline required (min 5 characters)'),
  description: z.string().optional(),
  propertyId: z.string().uuid('Select a property'),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().min(1, 'End date required'),
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

export default function NewPromotionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    getProperties().then(setProperties);
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      ctaText: '',
      ctaLink: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    if (imageUploading) {
      toast.error('Wait for the image upload to finish before continuing.');
      return;
    }

    setLoading(true);
    try {
      const promotionData = {
        propertyId: data.propertyId,
        headline: data.headline,
        description: normalizeOptionalFormValue(data.description) ?? undefined,
        startDate: data.startDate,
        endDate: data.endDate,
        imageUrl,
        ctaText: normalizeOptionalFormValue(data.ctaText),
        ctaLink: normalizeOptionalFormValue(data.ctaLink),
      };
      const promotionId = await createPromotion(promotionData);
      router.push(`/promotions/new/review?id=${promotionId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save promotion. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Promotion</h1>
        <p className="text-sm text-gray-500 mt-1">Step 1 of 2 — Promotion details</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <div>
          <label htmlFor="headline" className="block text-sm font-medium text-gray-700 mb-1">Headline *</label>
          <input id="headline" {...register('headline')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          {errors.headline && <p className="text-xs text-red-500 mt-1">{errors.headline.message}</p>}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
          <textarea id="description" {...register('description')} rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>

        <PromotionMediaField
          imageUrl={imageUrl}
          onChange={setImageUrl}
          disabled={loading}
          onUploadingChange={setImageUploading}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ctaText" className="block text-sm font-medium text-gray-700 mb-1">CTA text (optional)</label>
            <input id="ctaText" {...register('ctaText')}
              placeholder="Book now"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            {errors.ctaText && <p className="text-xs text-red-500 mt-1">{errors.ctaText.message}</p>}
          </div>
          <div>
            <label htmlFor="ctaLink" className="block text-sm font-medium text-gray-700 mb-1">CTA URL (optional)</label>
            <input id="ctaLink" {...register('ctaLink')}
              placeholder="https://example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            {errors.ctaLink && <p className="text-xs text-red-500 mt-1">{errors.ctaLink.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="propertyId" className="block text-sm font-medium text-gray-700 mb-1">Property *</label>
          <select id="propertyId" {...register('propertyId')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">Select a property</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {errors.propertyId && <p className="text-xs text-red-500 mt-1">{errors.propertyId.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Start date *</label>
            <input id="startDate" {...register('startDate')} type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate.message}</p>}
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">End date *</label>
            <input id="endDate" {...register('endDate')} type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate.message}</p>}
          </div>
        </div>

        <p className="text-sm text-gray-600">
          Placement plan and pricing are selected on the review step.
        </p>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.push('/dashboard')}
            className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-semibold hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={loading || imageUploading}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Saving...' : imageUploading ? 'Uploading image...' : 'Continue to Review & Pay →'}
          </button>
        </div>
      </form>
    </div>
  );
}
