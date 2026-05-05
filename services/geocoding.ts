// Geocoding helper backed by OpenStreetMap Nominatim.
//
// Why Nominatim: free, no API key, sufficient accuracy for street-level
// commercial-property addresses. Rate limit is 1 request per second per the
// Nominatim usage policy — we serialize calls through a process-local queue
// so backfill scripts and admin create-flow callers never violate it. The
// User-Agent header is required by policy; "UNIT-app/1.0" identifies the
// caller.
//
// Failure mode: this function NEVER throws. On network error, non-200, empty
// result, or malformed payload it logs a console warning and returns null,
// which lets callers persist NULL coordinates and retry later via the
// backfill script.

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'UNIT-app/1.0 (https://unit.app)';
const MIN_INTERVAL_MS = 1000;

let lastRequestAt = 0;

async function throttle(): Promise<void> {
  const now = Date.now();
  const wait = lastRequestAt + MIN_INTERVAL_MS - now;
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestAt = Date.now();
}

export type GeocodeResult = { lat: number; lon: number };

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;

  await throttle();

  const url = `${NOMINATIM_ENDPOINT}?q=${encodeURIComponent(trimmed)}&format=json&limit=1`;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      console.warn(`[geocoding] Nominatim returned ${response.status} for "${trimmed}"`);
      return null;
    }
    const payload = (await response.json()) as Array<{ lat: string; lon: string }> | null;
    if (!payload || payload.length === 0) {
      console.warn(`[geocoding] No result for "${trimmed}"`);
      return null;
    }
    const lat = Number(payload[0].lat);
    const lon = Number(payload[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      console.warn(`[geocoding] Malformed coords for "${trimmed}":`, payload[0]);
      return null;
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      console.warn(`[geocoding] Out-of-range coords for "${trimmed}": lat=${lat} lon=${lon}`);
      return null;
    }
    return { lat, lon };
  } catch (err) {
    console.warn(`[geocoding] Failed to geocode "${trimmed}":`, err);
    return null;
  }
}
