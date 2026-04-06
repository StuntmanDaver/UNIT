import { useQuery } from '@tanstack/react-query';
import { notificationsService } from '@/services/notifications';

export function useUnreadCount(userEmail: string, propertyId: string) {
  return useQuery<number>({
    queryKey: ['unreadCount', userEmail, propertyId],
    queryFn: () => notificationsService.getUnreadCount(userEmail, propertyId),
    enabled: !!userEmail && !!propertyId,
    refetchInterval: 30000,
  });
}
