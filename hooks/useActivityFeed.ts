import { useQuery } from '@tanstack/react-query';
import {
  getActivityFeed,
  type ActivityFeedItem,
} from '@/services/activityFeed';

const SIXTY_SECONDS_MS = 60 * 1000;

/**
 * Home tab activity feed (US-006). Same hook powers the My-Property and
 * Nearby segments on US-008 — pass `[origin]` for one or
 * `[origin, ...nearbyIds]` for the cluster.
 *
 * Cache key includes `propertyIds.join(',')` so switching segments keys a
 * fresh entry instead of overwriting the My-Property cache. `staleTime`
 * 60s per PRD acceptance.
 */
export function useActivityFeed(
  propertyIds: string[],
  limit = 50
) {
  return useQuery<ActivityFeedItem[]>({
    queryKey: ['activityFeed', propertyIds.join(','), limit],
    queryFn: () => getActivityFeed(propertyIds, limit),
    enabled: propertyIds.length > 0,
    staleTime: SIXTY_SECONDS_MS,
  });
}
