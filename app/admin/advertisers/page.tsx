export const dynamic = 'force-dynamic';

import { AdminPromotionsClient } from '@/components/admin/AdminPromotionsClient';
import { getAdminPromotions } from '@/lib/admin/actions';
import { firstSearchParam, readAdminSearchParams, type AdminSearchParams } from '@/lib/admin/search-params';

type Props = {
  searchParams?: AdminSearchParams;
};

export default async function AdminAdvertisersPage({ searchParams }: Props) {
  const params = await readAdminSearchParams(searchParams);
  const propertyId = firstSearchParam(params, 'propertyId');
  const filter = firstSearchParam(params, 'filter') ?? 'Pending';
  const recentWindow = firstSearchParam(params, 'window') === 'recent';
  const data = await getAdminPromotions({ propertyId, segment: filter });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black">Review Queue</h1>
        <p className="mt-1 text-sm text-[#465A75]">Review advertiser and tenant promotion submissions.</p>
      </header>
      <AdminPromotionsClient
        properties={data.properties}
        promotions={data.promotions}
        selectedPropertyId={data.selectedPropertyId}
        selectedSegment={filter as never}
        recentWindow={recentWindow}
        segmentMode="review-status"
        showNewExternalAction={false}
      />
    </div>
  );
}
