export const dynamic = 'force-dynamic';

import { AdminPromotionsClient } from '@/components/admin/AdminPromotionsClient';
import { getAdminPromotions } from '@/lib/admin/actions';
import { firstSearchParam, readAdminSearchParams, type AdminSearchParams } from '@/lib/admin/search-params';

type Props = {
  searchParams?: AdminSearchParams;
};

export default async function AdminPromotionsPage({ searchParams }: Props) {
  const params = await readAdminSearchParams(searchParams);
  const propertyId = firstSearchParam(params, 'propertyId');
  const filter = firstSearchParam(params, 'filter') ?? 'All';
  const data = await getAdminPromotions({ propertyId, segment: filter });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black">All Promotions</h1>
        <p className="mt-1 text-sm text-[#465A75]">Manage all paid, external, and historical promotion records.</p>
      </header>
      <AdminPromotionsClient
        properties={data.properties}
        promotions={data.promotions}
        selectedPropertyId={data.selectedPropertyId}
        selectedSegment={filter as never}
      />
    </div>
  );
}
