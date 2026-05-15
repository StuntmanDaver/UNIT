export const dynamic = 'force-dynamic';

import { ModerationClient } from '@/components/admin/ModerationClient';
import { getContentReports, updateContentReportStatusAction } from '@/lib/admin/actions';
import { firstSearchParam, readAdminSearchParams, type AdminSearchParams } from '@/lib/admin/search-params';

type Props = {
  searchParams?: AdminSearchParams;
};

export default async function AdminModerationPage({ searchParams }: Props) {
  const params = await readAdminSearchParams(searchParams);
  const propertyId = firstSearchParam(params, 'propertyId');
  const data = await getContentReports(propertyId);

  return (
    <ModerationClient
      properties={data.properties}
      reports={data.reports}
      selectedPropertyId={data.selectedPropertyId}
      actions={{
        updateReportStatus: updateContentReportStatusAction,
      }}
    />
  );
}
