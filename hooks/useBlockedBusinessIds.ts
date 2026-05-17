import { useQuery } from '@tanstack/react-query';
import { contentModerationService } from '@/services/contentModeration';

export function useBlockedBusinessIds(propertyId: string) {
  return useQuery<string[]>({
    queryKey: ['blockedBusinessIds', propertyId],
    queryFn: () => contentModerationService.listBlockedBusinessIds(propertyId),
    enabled: !!propertyId,
  });
}
