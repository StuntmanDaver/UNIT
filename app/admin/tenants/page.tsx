export const dynamic = 'force-dynamic';

import { TenantAdminClient, type TenantStatusFilter } from '@/components/admin/TenantAdminClient';
import {
  disableTenantAction,
  getAdminTenants,
  inviteTenantAction,
  inviteTenantsAction,
  reactivateTenantAction,
} from '@/lib/admin/actions';
import { firstSearchParam, readAdminSearchParams, type AdminSearchParams } from '@/lib/admin/search-params';

type Props = {
  searchParams?: AdminSearchParams;
};

function statusFilter(value?: string): TenantStatusFilter {
  return value === 'invited' || value === 'active' || value === 'inactive' ? value : 'all';
}

export default async function AdminTenantsPage({ searchParams }: Props) {
  const params = await readAdminSearchParams(searchParams);
  const propertyId = firstSearchParam(params, 'propertyId');
  const status = statusFilter(firstSearchParam(params, 'status'));
  const search = firstSearchParam(params, 'search') ?? '';
  const data = await getAdminTenants({ propertyId, status, search });

  return (
    <TenantAdminClient
      properties={data.properties}
      tenants={data.tenants}
      selectedPropertyId={data.selectedPropertyId}
      initialStatus={status}
      initialSearch={search}
      actions={{
        inviteTenant: inviteTenantAction,
        importTenants: inviteTenantsAction,
        disableTenant: disableTenantAction,
        reactivateTenant: reactivateTenantAction,
      }}
    />
  );
}
