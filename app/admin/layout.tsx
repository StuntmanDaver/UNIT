import Link from 'next/link';
import { AdminNav } from '@/components/admin/AdminNav';
import { requireAdmin } from '@/lib/admin/auth';
import { logoutAdminAction } from '@/lib/admin/actions';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const context = await requireAdmin();
  const adminName = context.profile.full_name || context.profile.display_name || context.profile.email;

  return (
    <div className="unit-page">
      <nav className="border-b border-[#465A75]/30 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <Link href="/admin" className="text-lg font-black text-[#101B29] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#465A75]/30">
              UNIT Admin
            </Link>
            <div className="flex min-w-0 items-center gap-3">
              <span className="hidden truncate text-sm font-semibold text-[#5F708A] sm:inline">{adminName}</span>
              <form action={logoutAdminAction}>
                <button type="submit" className="unit-btn unit-btn-secondary min-h-10 px-3 py-2">
                  Logout
                </button>
              </form>
            </div>
          </div>
          <AdminNav />
        </div>
      </nav>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
