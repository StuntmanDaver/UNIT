export const dynamic = 'force-dynamic';

import { AdvertiserAccountsClient, type AdvertiserAccountStatus } from '@/components/admin/AdvertiserAccountsClient';
import {
  approveAdvertiserAccountAction,
  getAdvertiserAccounts,
  reactivateAdvertiserAccountAction,
  suspendAdvertiserAccountAction,
} from '@/lib/admin/actions';
import { firstSearchParam, readAdminSearchParams, type AdminSearchParams } from '@/lib/admin/search-params';

type Props = {
  searchParams?: AdminSearchParams;
};

function accountStatus(value?: string): AdvertiserAccountStatus {
  return value === 'active' || value === 'suspended' ? value : 'pending';
}

export default async function AdminAdvertiserAccountsPage({ searchParams }: Props) {
  const params = await readAdminSearchParams(searchParams);
  const status = accountStatus(firstSearchParam(params, 'status'));
  const accounts = await getAdvertiserAccounts(status);

  return (
    <AdvertiserAccountsClient
      accounts={accounts}
      initialStatus={status}
      actions={{
        approveAdvertiserAccount: approveAdvertiserAccountAction,
        suspendAdvertiserAccount: suspendAdvertiserAccountAction,
        reactivateAdvertiserAccount: reactivateAdvertiserAccountAction,
      }}
    />
  );
}
