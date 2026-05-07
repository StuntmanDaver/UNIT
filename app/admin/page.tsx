export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminDashboardData } from '@/lib/admin/actions';
import { firstSearchParam, readAdminSearchParams, type AdminSearchParams } from '@/lib/admin/search-params';

type Props = {
  searchParams?: AdminSearchParams;
};

export default async function AdminDashboardPage({ searchParams }: Props) {
  const params = await readAdminSearchParams(searchParams);
  const propertyId = firstSearchParam(params, 'propertyId');
  const data = await getAdminDashboardData(propertyId);
  if (!propertyId && data.selectedPropertyId) {
    redirect(`/admin?propertyId=${encodeURIComponent(data.selectedPropertyId)}`);
  }
  const selectedProperty = data.properties.find((property) => property.id === data.selectedPropertyId);

  const stats = [
    { label: 'Total Tenants', value: data.stats?.totalTenants ?? 0, href: `/admin/tenants?propertyId=${data.selectedPropertyId}` },
    { label: 'Active Accounts', value: data.stats?.activeAccounts ?? 0, href: `/admin/tenants?propertyId=${data.selectedPropertyId}&status=active` },
    { label: 'Pending Invites', value: data.stats?.pendingInvites ?? 0, href: `/admin/tenants?propertyId=${data.selectedPropertyId}&status=invited` },
    { label: 'Promotions 30d', value: data.stats?.activePromotions ?? 0, href: `/admin/advertisers?propertyId=${data.selectedPropertyId}&filter=Approved&window=recent` },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-black">Admin Overview</h1>
          <p className="mt-1 text-sm text-[#465A75]">
            {selectedProperty ? `Operating ${selectedProperty.name}` : 'Select a property to begin.'}
          </p>
        </div>
        <form className="flex w-full flex-col gap-2 sm:max-w-md sm:flex-row" action="/admin">
          <select name="propertyId" className="unit-input" defaultValue={data.selectedPropertyId}>
            {data.properties.length === 0 && <option value="">No assigned properties</option>}
            {data.properties.map((property) => (
              <option key={property.id} value={property.id}>{property.name}</option>
            ))}
          </select>
          <button type="submit" className="unit-btn unit-btn-primary shrink-0">Switch</button>
        </form>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="unit-stat block text-left hover:border-[#465A75]">
            <p className="text-xs font-bold uppercase text-[#465A75]">{stat.label}</p>
            <p className="mt-1 text-3xl font-black text-[#101B29]">{stat.value.toLocaleString()}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Link className="unit-card p-5 transition-shadow hover:shadow-md" href={`/admin/tenants?propertyId=${data.selectedPropertyId}`}>
          <h2 className="font-black">Tenant Directory</h2>
          <p className="mt-1 text-sm text-[#465A75]">Invite, import, export, disable, and reactivate tenants.</p>
        </Link>
        <Link className="unit-card p-5 transition-shadow hover:shadow-md" href={`/admin/advertisers?propertyId=${data.selectedPropertyId}&filter=Pending`}>
          <h2 className="font-black">Review Queue</h2>
          <p className="mt-1 text-sm text-[#465A75]">Approve, request revisions, require repayment, reject, or refund.</p>
        </Link>
        <Link className="unit-card p-5 transition-shadow hover:shadow-md" href={`/admin/promotions?propertyId=${data.selectedPropertyId}&filter=All`}>
          <h2 className="font-black">Promotion Library</h2>
          <p className="mt-1 text-sm text-[#465A75]">Browse paid, external, approved, and historical promotion records.</p>
        </Link>
        <Link className="unit-card p-5 transition-shadow hover:shadow-md" href="/admin/advertiser-accounts?status=pending">
          <h2 className="font-black">Advertiser Approval</h2>
          <p className="mt-1 text-sm text-[#465A75]">Approve pending advertisers so they can submit promotions.</p>
        </Link>
        <Link className="unit-card p-5 transition-shadow hover:shadow-md" href="/admin/properties">
          <h2 className="font-black">Properties</h2>
          <p className="mt-1 text-sm text-[#465A75]">Create and review assigned properties.</p>
        </Link>
        <Link className="unit-card p-5 transition-shadow hover:shadow-md" href="/admin/pricing">
          <h2 className="font-black">Pricing Tiers</h2>
          <p className="mt-1 text-sm text-[#465A75]">Manage active promotion checkout tiers.</p>
        </Link>
        <Link className="unit-card p-5 transition-shadow hover:shadow-md" href={`/admin/push?propertyId=${data.selectedPropertyId}`}>
          <h2 className="font-black">Broadcasts</h2>
          <p className="mt-1 text-sm text-[#465A75]">Send property-scoped announcements to tenants.</p>
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-black">Recent Activity</h2>
        {data.recentActivity.map((activity) => (
          <article key={`${activity.type}-${activity.id}`} className="unit-card p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-black">{activity.label}</p>
                <p className="text-sm text-[#465A75]">{activity.sublabel}</p>
              </div>
              <p className="text-xs font-semibold text-[#5F708A]">{new Date(activity.created_at).toLocaleString()}</p>
            </div>
          </article>
        ))}
        {data.recentActivity.length === 0 && (
          <div className="unit-card py-12 text-center text-sm text-[#465A75]">No recent activity for this property.</div>
        )}
      </section>
    </div>
  );
}
