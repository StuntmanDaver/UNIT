import { useQuery } from '@tanstack/react-query';
import { NEARBY_RADIUS_MILES } from '@/constants/nearby';
import { getNearbyPropertyIds } from '@/services/nearbyProperties';

const ONE_HOUR_MS = 60 * 60 * 1000;

export function useNearbyPropertyIds(
  originPropertyId: string | null | undefined,
  radiusMiles = NEARBY_RADIUS_MILES
) {
  return useQuery<string[]>({
    queryKey: ['nearby-properties', originPropertyId, radiusMiles],
    queryFn: () => getNearbyPropertyIds(originPropertyId as string, radiusMiles),
    enabled: !!originPropertyId,
    staleTime: ONE_HOUR_MS,
  });
}
