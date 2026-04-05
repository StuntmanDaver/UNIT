import { useQuery } from '@tanstack/react-query';
import { postsService, type Post } from '@/services/posts';
import { advertiserPromotionsService, type AdvertiserPromotion } from '@/services/advertiser-promotions';

export type PromotionItem =
  | { kind: 'tenant'; data: Post }
  | { kind: 'advertiser'; data: AdvertiserPromotion };

type Segment = 'All' | 'Tenant Offers' | 'Local Deals';

export function usePromotions(propertyId: string, segment: Segment) {
  return useQuery<PromotionItem[]>({
    queryKey: ['promotions', propertyId, segment],
    queryFn: async () => {
      const now = new Date().toISOString();
      const results: PromotionItem[] = [];

      const fetchTenant = segment === 'All' || segment === 'Tenant Offers';
      const fetchAdvertiser = segment === 'All' || segment === 'Local Deals';

      const [tenantPosts, advertiserPromotions] = await Promise.all([
        fetchTenant
          ? postsService.filter({ property_id: propertyId, type: 'offer' })
          : Promise.resolve([] as Post[]),
        fetchAdvertiser
          ? advertiserPromotionsService.filter(
              { property_id: propertyId, approval_status: 'approved' }
            )
          : Promise.resolve([] as AdvertiserPromotion[]),
      ]);

      for (const post of tenantPosts) {
        results.push({ kind: 'tenant', data: post });
      }

      for (const promo of advertiserPromotions) {
        const withinDateRange =
          (!promo.start_date || promo.start_date <= now) &&
          (!promo.end_date || promo.end_date >= now);
        if (withinDateRange) {
          results.push({ kind: 'advertiser', data: promo });
        }
      }

      results.sort((a, b) => {
        const dateA =
          a.kind === 'tenant' ? a.data.created_date : a.data.created_at;
        const dateB =
          b.kind === 'tenant' ? b.data.created_date : b.data.created_at;
        return dateB.localeCompare(dateA);
      });

      return results;
    },
    enabled: !!propertyId,
  });
}
