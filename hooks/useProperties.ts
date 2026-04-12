import { useQuery } from '@tanstack/react-query';
import { propertiesService, type Property } from '@/services/properties';

export function useProperties(propertyIds: string[]) {
  return useQuery<Property[]>({
    queryKey: ['properties', propertyIds],
    queryFn: () => propertiesService.getByIds(propertyIds),
    enabled: propertyIds.length > 0,
  });
}
