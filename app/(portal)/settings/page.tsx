'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { AdvertiserProfile } from '@/lib/supabase/types';
import { getMyProfile, updateMyProfile } from './actions';

const schema = z.object({
  businessName: z.string().min(2, 'Business name required'),
  contactEmail: z.string().email('Valid email required'),
});
type FormData = z.infer<typeof schema>;

export default function SettingsPage() {
  const [profile, setProfile] = useState<AdvertiserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    getMyProfile().then((p) => {
      if (!p) return;
      setProfile(p as AdvertiserProfile);
      reset({ businessName: p.business_name, contactEmail: p.contact_email });
    });
  }, []);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await updateMyProfile(data.businessName, data.contactEmail);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return <div className="py-20 text-center text-gray-400">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl shadow-sm p-6 space-y-5 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business name</label>
          <input {...register('businessName')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          {errors.businessName && <p className="text-xs text-red-500 mt-1">{errors.businessName.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact email</label>
          <input {...register('contactEmail')} type="email"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          {errors.contactEmail && <p className="text-xs text-red-500 mt-1">{errors.contactEmail.message}</p>}
        </div>
        <button type="submit" disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
