import { useQuery } from '@tanstack/react-query';
import { notificationsService, type Notification } from '@/services/notifications';

export function useNotifications(userId: string, propertyId: string) {
  return useQuery<Notification[]>({
    queryKey: ['notifications', userId, propertyId],
    queryFn: () =>
      notificationsService.filter({
        user_id: userId,
        property_id: propertyId,
      }),
    enabled: !!userId && !!propertyId,
  });
}
