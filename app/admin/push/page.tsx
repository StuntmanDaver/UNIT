export const dynamic = 'force-dynamic';

import { PushAdminClient } from '@/components/admin/PushAdminClient';
import { getBroadcastHistory, sendPushBroadcastAction } from '@/lib/admin/actions';
import { firstSearchParam, readAdminSearchParams, type AdminSearchParams } from '@/lib/admin/search-params';

type Props = {
  searchParams?: AdminSearchParams;
};

export default async function AdminPushPage({ searchParams }: Props) {
  const params = await readAdminSearchParams(searchParams);
  const propertyId = firstSearchParam(params, 'propertyId');
  const data = await getBroadcastHistory(propertyId);

  return (
    <PushAdminClient
      properties={data.properties}
      selectedPropertyId={data.selectedPropertyId}
      notifications={data.notifications}
      onSendBroadcast={sendPushBroadcastAction}
    />
  );
}
