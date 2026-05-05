/**
 * Nearby properties — radius-based auto-grouping.
 *
 * Implementation choice: client-side haversine.
 *   Pros: no DB migration, no PG extensions, trivially unit-testable in pure JS.
 *   Cons: scans all rows in `properties`. Acceptable while the property count is
 *         small (target MVP < 100 rows). If row counts grow, swap the
 *         implementation for a `supabase.rpc('nearby_property_ids', ...)` call
 *         backed by an `earthdistance`/`cube`-extension PostgreSQL function —
 *         the public API of `getNearbyPropertyIds` is stable across either
 *         strategy.
 *
 * Per US-004 / PRD (2026-05-02): the May-1 `property_groups` table stays in
 * place for a future labelled-cluster UI but is intentionally NOT consumed
 * here — this milestone is auto-grouping only.
 */
import { supabase } from './supabase';

const EARTH_RADIUS_MILES = 3958.7613;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance between two coordinates in miles. */
export function haversineMiles(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.asin(Math.min(1, Math.sqrt(h)));
  return EARTH_RADIUS_MILES * c;
}

type CoordRow = {
  id: string;
  latitude: number | null;
  longitude: number | null;
};

/**
 * Returns property IDs within `radiusMiles` of `originPropertyId`.
 * The origin property is always element 0, even if it has no coordinates.
 * Neighbours are sorted nearest-first.
 */
export async function getNearbyPropertyIds(
  originPropertyId: string,
  radiusMiles = 2
): Promise<string[]> {
  const { data: origin, error: originErr } = await supabase
    .from('properties')
    .select('id, latitude, longitude')
    .eq('id', originPropertyId)
    .single();
  if (originErr) throw originErr;
  if (!origin) throw new Error(`Property not found: ${originPropertyId}`);

  // Origin missing coords → no distance computation possible. Return origin
  // alone so callers can still render the My-Property feed.
  if (origin.latitude == null || origin.longitude == null) {
    return [origin.id];
  }

  const { data: rows, error } = await supabase
    .from('properties')
    .select('id, latitude, longitude');
  if (error) throw error;

  const originPoint = { lat: origin.latitude, lon: origin.longitude };
  const neighbours: { id: string; distance: number }[] = [];

  for (const row of (rows ?? []) as CoordRow[]) {
    if (row.id === origin.id) continue;
    if (row.latitude == null || row.longitude == null) continue;
    const distance = haversineMiles(originPoint, {
      lat: row.latitude,
      lon: row.longitude,
    });
    if (distance <= radiusMiles) {
      neighbours.push({ id: row.id, distance });
    }
  }

  neighbours.sort((a, b) => a.distance - b.distance);
  return [origin.id, ...neighbours.map((n) => n.id)];
}
