import { useQuery } from '@tanstack/react-query';
import { advertiserPromotionsService, type AdvertiserPromotion } from '@/services/advertiser-promotions';

export function useAdvertiserPromotions(propertyId: string, status?: string) {
  return useQuery<AdvertiserPromotion[]>({
    queryKey: ['advertiserPromotions', propertyId, status],
    queryFn: async () => {
      const filters: Record<string, string> = { property_id: propertyId };
      if (status) filters.approval_status = status;
      return advertiserPromotionsService.filter(filters);
    },
    enabled: !!propertyId,
  });
}
