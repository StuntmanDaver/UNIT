export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ExternalPromotionForm } from '@/components/admin/ExternalPromotionForm';
import { createExternalPromotionFromFormAction, getAdminProperties } from '@/lib/admin/actions';
import { firstSearchParam, readAdminSearchParams, type AdminSearchParams } from '@/lib/admin/search-params';

type Props = {
  searchParams?: AdminSearchParams;
};

export default async function NewExternalPromotionPage({ searchParams }: Props) {
  const params = await readAdminSearchParams(searchParams);
  const properties = await getAdminProperties();
  const propertyId = firstSearchParam(params, 'propertyId') ?? properties[0]?.id ?? null;
  const backHref = propertyId
    ? `/admin/promotions?propertyId=${encodeURIComponent(propertyId)}&filter=External`
    : '/admin/promotions';

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2">
        <Link href={backHref} className="unit-link">Back to external promotions</Link>
        <h1 className="text-2xl font-black">External Promotion</h1>
        <p className="text-sm text-[#465A75]">Create an admin-authored promotion that is approved immediately.</p>
      </div>
      <div className="unit-card p-5">
        <ExternalPromotionForm
          properties={properties}
          selectedPropertyId={propertyId}
          onSubmit={createExternalPromotionFromFormAction}
        />
      </div>
    </div>
  );
}
