import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { AdvertiserProfile } from '@/lib/supabase/types';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('advertiser_profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: AdvertiserProfile | null };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="text-lg font-bold text-gray-900">
          UNIT Ads
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
          <Link href="/settings" className="text-gray-600 hover:text-gray-900">Settings</Link>
          <span className="text-gray-400">{profile?.business_name}</span>
        </div>
      </nav>

      {profile?.status === 'pending' && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-2 text-sm text-yellow-800 text-center">
          Your account is pending admin approval. You can view your dashboard but cannot submit new promotions yet.
        </div>
      )}
      {profile?.status === 'suspended' && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2 text-sm text-red-800 text-center">
          Your account has been suspended. Contact support for more information.
        </div>
      )}

      <main className="max-w-4xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
