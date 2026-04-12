import { useQuery } from '@tanstack/react-query';
import { notificationsService } from '@/services/notifications';

export function useUnreadCount(userId: string, propertyId: string) {
  return useQuery<number>({
    queryKey: ['unreadCount', userId, propertyId],
    queryFn: () => notificationsService.getUnreadCount(userId, propertyId),
    enabled: !!userId && !!propertyId,
    refetchInterval: 30000,
  });
}
