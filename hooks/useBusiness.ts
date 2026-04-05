import { useQuery } from '@tanstack/react-query';
import { businessesService, type Business } from '@/services/businesses';

export function useBusiness(id: string) {
  return useQuery<Business>({
    queryKey: ['businesses', id],
    queryFn: () => businessesService.getById(id),
    enabled: !!id,
  });
}
