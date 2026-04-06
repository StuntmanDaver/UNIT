import { useQuery } from '@tanstack/react-query';
import { notificationsService, type Notification } from '@/services/notifications';

export function useNotifications(userEmail: string, propertyId: string) {
  return useQuery<Notification[]>({
    queryKey: ['notifications', userEmail, propertyId],
    queryFn: () =>
      notificationsService.filter({
        user_email: userEmail,
        property_id: propertyId,
      }),
    enabled: !!userEmail && !!propertyId,
  });
}
