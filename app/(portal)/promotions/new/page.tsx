'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

const PLACEMENT_FEE_CENTS = 4999; // $49.99

const schema = z.object({
  headline: z.string().min(5, 'Headline required (min 5 characters)'),
  description: z.string().optional(),
  propertyId: z.string().uuid('Select a property'),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().min(1, 'End date required'),
}).refine((d) => d.endDate > d.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});
type FormData = z.infer<typeof schema>;

// TODO: replace with a real properties list from Supabase
const AVAILABLE_PROPERTIES = [
  { id: '', label: 'Select a property' },
  // These IDs come from your `properties` table — fetch them dynamically in production
];

export default function NewPromotionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: profile } = await supabase
      .from('advertiser_profiles')
      .select('status, business_name')
      .eq('id', user.id)
      .single();

    if (profile?.status !== 'active') {
      toast.error('Your account is pending approval. You cannot submit promotions yet.');
      setLoading(false);
      return;
    }

    const { data: promotion, error } = await supabase
      .from('promotions')
      .insert({
        advertiser_id: user.id,
        business_name: profile.business_name,
        property_id: data.propertyId,
        headline: data.headline,
        description: data.description ?? null,
        start_date: data.startDate,
        end_date: data.endDate,
        review_status: 'draft',
        payment_status: 'unpaid',
      })
      .select('id')
      .single();

    setLoading(false);

    if (error || !promotion) {
      toast.error('Failed to save promotion. Please try again.');
      return;
    }

    router.push(`/promotions/new/review?id=${promotion.id}`);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Promotion</h1>
        <p className="text-sm text-gray-500 mt-1">Step 1 of 2 — Promotion details</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Headline *</label>
          <input {...register('headline')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          {errors.headline && <p className="text-xs text-red-500 mt-1">{errors.headline.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
          <textarea {...register('description')} rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Property *</label>
          <select {...register('propertyId')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            {AVAILABLE_PROPERTIES.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          {errors.propertyId && <p className="text-xs text-red-500 mt-1">{errors.propertyId.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start date *</label>
            <input {...register('startDate')} type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End date *</label>
            <input {...register('endDate')} type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate.message}</p>}
          </div>
        </div>

        <p className="text-sm font-medium text-gray-700">
          Placement fee: <span className="text-blue-700 font-bold">${(PLACEMENT_FEE_CENTS / 100).toFixed(2)}</span>
        </p>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.push('/dashboard')}
            className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-semibold hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Saving...' : 'Continue to Review & Pay →'}
          </button>
        </div>
      </form>
    </div>
  );
}
