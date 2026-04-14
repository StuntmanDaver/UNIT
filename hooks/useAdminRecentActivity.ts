import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin';

export function useAdminRecentActivity(propertyId: string) {
  return useQuery({
    queryKey: ['adminRecentActivity', propertyId],
    queryFn: () => adminService.getRecentActivity(propertyId),
    enabled: !!propertyId,
  });
}
