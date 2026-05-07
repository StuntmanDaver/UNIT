import Link from 'next/link';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { AdvertiserProfile } from '@/lib/supabase/types';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = createServiceRoleClient();
  const { data: profile } = await service
    .from('advertiser_profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: AdvertiserProfile | null };

  return (
    <div className="unit-page">
      <nav className="border-b border-[#465A75]/30 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <Link href="/dashboard" className="text-lg font-black text-[#101B29] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#465A75]/30">
          UNIT Ads
        </Link>
        <div className="flex min-w-0 items-center gap-3 text-sm sm:gap-6">
          <Link href="/dashboard" className="unit-link">Dashboard</Link>
          <Link href="/settings" className="unit-link">Settings</Link>
          <span className="hidden truncate text-[#5F708A] sm:inline">{profile?.business_name}</span>
        </div>
        </div>
      </nav>

      {profile?.status === 'pending' && (
        <div className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-center text-sm font-medium text-amber-800">
          Your account is pending admin approval. You can view your dashboard but cannot submit new promotions yet.
        </div>
      )}
      {profile?.status === 'suspended' && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-center text-sm font-medium text-red-800">
          Your account has been suspended. Contact support for more information.
        </div>
      )}

      <main className="unit-shell">
        {children}
      </main>
    </div>
  );
}
