import { useQuery } from '@tanstack/react-query';
import { propertiesService, type Property } from '@/services/properties';

export function useProperties(propertyIds: string[]) {
  return useQuery<Property[]>({
    queryKey: ['properties', propertyIds],
    queryFn: async () => {
      return Promise.all(propertyIds.map((id) => propertiesService.getById(id)));
    },
    enabled: propertyIds.length > 0,
  });
}
