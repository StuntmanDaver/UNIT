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
  }, [reset]);

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

  if (!profile) return <div className="unit-loading">Loading…</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black">Settings</h1>
        <p className="mt-1 text-sm text-[#465A75]">Keep your advertiser profile in sync with UNIT.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="unit-card max-w-lg space-y-5 p-6">
        <div>
          <label htmlFor="businessName" className="unit-label">Business Name</label>
          <input id="businessName" {...register('businessName')}
            name="businessName"
            autoComplete="organization"
            className="unit-input" />
          {errors.businessName && <p className="text-xs text-red-500 mt-1">{errors.businessName.message}</p>}
        </div>
        <div>
          <label htmlFor="contactEmail" className="unit-label">Contact Email</label>
          <input id="contactEmail" {...register('contactEmail')} type="email"
            name="contactEmail"
            autoComplete="email"
            spellCheck={false}
            className="unit-input" />
          {errors.contactEmail && <p className="text-xs text-red-500 mt-1">{errors.contactEmail.message}</p>}
        </div>
        <button type="submit" disabled={loading}
          className="unit-btn unit-btn-primary">
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
