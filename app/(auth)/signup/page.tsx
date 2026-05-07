'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { createAdvertiserProfile } from './actions';

const schema = z.object({
  businessName: z.string().min(2, 'Business name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type FormData = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const { data: authData, error: signUpError } = await supabase.auth.signUp({ email: data.email, password: data.password });
    if (signUpError || !authData.user) { setLoading(false); toast.error(signUpError?.message ?? 'Signup failed'); return; }
    const { error: profileError } = await createAdvertiserProfile(authData.user.id, data.businessName, data.email);
    setLoading(false);
    if (profileError) { toast.error('Account created but profile setup failed. Please contact support.'); return; }
    toast.success('Account created! Your account is pending admin approval.');
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="unit-page flex items-center justify-center px-4 py-10">
      <div className="unit-card w-full max-w-md p-6 sm:p-8">
        <p className="mb-2 text-sm font-black uppercase tracking-wide text-[#465A75]">UNIT Ads</p>
        <h1 className="mb-2 text-2xl font-black">Create Advertiser Account</h1>
        <p className="mb-6 text-sm text-[#465A75]">Submit and manage local promotions for UNIT properties.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="businessName" className="unit-label">Business Name</label>
            <input id="businessName" {...register('businessName')} name="businessName" autoComplete="organization" className="unit-input" />
            {errors.businessName && <p className="text-xs text-red-500 mt-1">{errors.businessName.message}</p>}
          </div>
          <div>
            <label htmlFor="email" className="unit-label">Email</label>
            <input id="email" {...register('email')} name="email" type="email" autoComplete="email" spellCheck={false} className="unit-input" />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="unit-label">Password</label>
            <input id="password" {...register('password')} name="password" type="password" autoComplete="new-password" className="unit-input" />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={loading} className="unit-btn unit-btn-primary w-full">
            {loading ? 'Creating Account…' : 'Create Account'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-[#465A75]">
          Have an account? <Link href="/login" className="unit-link">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
