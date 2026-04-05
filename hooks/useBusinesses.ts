import { useQuery } from '@tanstack/react-query';
import { businessesService, type Business } from '@/services/businesses';

export function useBusinesses(propertyId: string, search?: string, category?: string) {
  return useQuery<Business[]>({
    queryKey: ['businesses', propertyId, { search, category }],
    queryFn: async () => {
      const filters: Record<string, string> = { property_id: propertyId };
      if (category) filters.category = category;
      return businessesService.filter(filters, search);
    },
    enabled: !!propertyId,
  });
}
