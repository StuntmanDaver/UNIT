'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    let isAdmin = false;
    if (user) {
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .eq('role', 'landlord')
        .maybeSingle();
      isAdmin = adminProfile?.role === 'landlord';
    }

    setLoading(false);
    router.push(isAdmin ? '/admin' : '/dashboard');
    router.refresh();
  };

  return (
    <div className="unit-page flex items-center justify-center px-4 py-10">
      <div className="unit-card w-full max-w-md p-6 sm:p-8">
        <p className="mb-2 text-sm font-black uppercase tracking-wide text-[#465A75]">UNIT Ads</p>
        <h1 className="mb-6 text-2xl font-black">Sign In To Your Account</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="unit-label">Email</label>
            <input id="email" {...register('email')} name="email" type="email" autoComplete="email" spellCheck={false} className="unit-input" />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="unit-label">Password</label>
            <input id="password" {...register('password')} name="password" type="password" autoComplete="current-password" className="unit-input" />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={loading} className="unit-btn unit-btn-primary w-full">
            {loading ? 'Signing In…' : 'Sign In'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-[#465A75]">
          No account? <Link href="/signup" className="unit-link">Create One</Link>
        </p>
      </div>
    </div>
  );
}
