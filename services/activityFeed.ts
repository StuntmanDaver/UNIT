/**
 * Activity feed — unified chronological stream of recent property events
 * for the Home tab (US-006).
 *
 * Powers both the My-Property feed (one property id) and the Nearby feed
 * (origin + radius result from `useNearbyPropertyIds`). The same service
 * accepts either by taking `propertyIds: string[]`.
 *
 * No N+1: each underlying source is fetched exactly once with `.in()` on
 * the property id list, then merged by `occurredAt DESC` in JS.
 */
import { supabase } from './supabase';

export type ActivityFeedKind =
  | 'promotion'
  | 'post'
  | 'alert'
  | 'tenant_signup'
  | 'business_update'
  | 'announcement';

export type ActivityFeedItem = {
  kind: ActivityFeedKind;
  id: string;
  propertyId: string;
  /** ISO 8601 timestamp used for chronological merge (DESC). */
  occurredAt: string;
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  ctaRoute?: string;
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function thirtyDaysAgoIso(): string {
  return new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
}

type PromotionRow = {
  id: string;
  property_id: string;
  headline: string;
  description: string | null;
  business_name: string;
  image_url: string | null;
  created_at: string;
};

async function fetchPromotions(
  propertyIds: string[],
  sinceIso: string
): Promise<ActivityFeedItem[]> {
  const { data, error } = await supabase
    .from('promotions')
    .select(
      'id, property_id, headline, description, business_name, image_url, created_at'
    )
    .in('property_id', propertyIds)
    .eq('review_status', 'approved')
    .gte('created_at', sinceIso);
  if (error) throw error;
  return ((data ?? []) as PromotionRow[]).map((row) => ({
    kind: 'promotion',
    id: row.id,
    propertyId: row.property_id,
    occurredAt: row.created_at,
    title: row.headline,
    subtitle: row.business_name || row.description || '',
    imageUrl: row.image_url,
    ctaRoute: `/(tabs)/promotions/${row.id}`,
  }));
}

type PostRow = {
  id: string;
  property_id: string;
  type: 'announcement' | 'event' | 'offer';
  title: string;
  content: string;
  image_url: string | null;
  created_date: string;
};

async function fetchPosts(
  propertyIds: string[],
  sinceIso: string
): Promise<ActivityFeedItem[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('id, property_id, type, title, content, image_url, created_date')
    .in('property_id', propertyIds)
    .gte('created_date', sinceIso);
  if (error) throw error;
  return ((data ?? []) as PostRow[]).map((row) => {
    const isAnnouncement = row.type === 'announcement';
    return {
      kind: isAnnouncement ? 'announcement' : 'post',
      id: row.id,
      propertyId: row.property_id,
      occurredAt: row.created_date,
      title: row.title,
      subtitle: row.content,
      imageUrl: row.image_url,
      // Announcements have no CTA per US-007 (read-only landlord text);
      // other post kinds deep-link into Community.
      ctaRoute: isAnnouncement ? undefined : '/(tabs)/community',
    };
  });
}

type NotificationRow = {
  id: string;
  property_id: string;
  title: string;
  message: string;
  created_date: string;
};

async function fetchNotifications(
  userId: string,
  propertyIds: string[],
  sinceIso: string
): Promise<ActivityFeedItem[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, property_id, title, message, created_date')
    .eq('user_id', userId)
    .in('property_id', propertyIds)
    .gte('created_date', sinceIso);
  if (error) throw error;
  return ((data ?? []) as NotificationRow[]).map((row) => ({
    kind: 'alert',
    id: row.id,
    propertyId: row.property_id,
    occurredAt: row.created_date,
    title: row.title,
    subtitle: row.message,
    ctaRoute: '/(tabs)/notifications',
  }));
}

type BusinessRow = {
  id: string;
  property_id: string;
  business_name: string;
  business_description: string | null;
  category: string | null;
  logo_url: string | null;
  created_at: string;
};

async function fetchBusinessSignups(
  propertyIds: string[],
  sinceIso: string
): Promise<ActivityFeedItem[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select(
      'id, property_id, business_name, business_description, category, logo_url, created_at'
    )
    .in('property_id', propertyIds)
    .gte('created_at', sinceIso);
  if (error) throw error;
  return ((data ?? []) as BusinessRow[]).map((row) => ({
    kind: 'tenant_signup',
    id: row.id,
    propertyId: row.property_id,
    occurredAt: row.created_at,
    title: `${row.business_name} joined the property`,
    subtitle: row.category || row.business_description || '',
    imageUrl: row.logo_url,
    ctaRoute: `/(tabs)/directory/${row.id}`,
  }));
}

/**
 * Returns up to `limit` activity items across all `propertyIds`, sorted
 * by `occurredAt` DESC. Returns `[]` immediately when `propertyIds` is
 * empty so callers don't need to guard.
 *
 * Sources fetched in parallel:
 *   - promotions (approved + last 30d)        → kind='promotion'
 *   - posts (last 30d)                        → kind='announcement' or 'post'
 *   - notifications for the calling user      → kind='alert'
 *   - businesses (last 30d, treated as new
 *     tenant signups)                         → kind='tenant_signup'
 *
 * `kind: 'business_update'` is reserved on the union for a future story
 * (currently unused — businesses table has no updated_at column).
 */
export async function getActivityFeed(
  propertyIds: string[],
  limit = 50
): Promise<ActivityFeedItem[]> {
  if (propertyIds.length === 0) return [];

  const sinceIso = thirtyDaysAgoIso();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sourcePromises: Promise<ActivityFeedItem[]>[] = [
    fetchPromotions(propertyIds, sinceIso),
    fetchPosts(propertyIds, sinceIso),
    fetchBusinessSignups(propertyIds, sinceIso),
  ];
  if (user) {
    sourcePromises.push(fetchNotifications(user.id, propertyIds, sinceIso));
  }

  const results = await Promise.all(sourcePromises);
  const merged = results.flat();
  merged.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return merged.slice(0, limit);
}
