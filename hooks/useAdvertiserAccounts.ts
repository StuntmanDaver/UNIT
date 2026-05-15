import { useQuery } from '@tanstack/react-query';
import {
  advertiserAccountsService,
  type AdvertiserAccountStatus,
  type AdvertiserAccountWithCount,
} from '@/services/advertiserAccounts';

export function useAdvertiserAccounts(status: AdvertiserAccountStatus | 'all') {
  return useQuery<AdvertiserAccountWithCount[]>({
    queryKey: ['advertiser-accounts', status],
    queryFn: () => advertiserAccountsService.list(status),
  });
}
