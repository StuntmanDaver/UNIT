import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin';

export function useAdminStats(propertyId: string) {
  return useQuery<{
    totalTenants: number;
    activeAccounts: number;
    pendingInvites: number;
    activePromotions: number;
  }>({
    queryKey: ['adminStats', propertyId],
    queryFn: () => adminService.getStats(propertyId),
    enabled: !!propertyId,
  });
}
