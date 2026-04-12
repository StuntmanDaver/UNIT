// hooks/useAdminPromotions.ts
import { useQuery } from '@tanstack/react-query';
import { promotionsService, type Promotion } from '@/services/promotions';

export function useAdminPromotion(id: string) {
  return useQuery<Promotion>({
    queryKey: ['admin-promotion', id],
    queryFn: () => promotionsService.getById(id),
    enabled: !!id,
  });
}

export function useAdminPromotionList(propertyId: string, reviewStatuses: Promotion['review_status'][]) {
  return useQuery<Promotion[]>({
    queryKey: ['admin-promotions', propertyId, reviewStatuses],
    queryFn: () => promotionsService.getAdminList(propertyId, reviewStatuses),
    enabled: !!propertyId,
  });
}
