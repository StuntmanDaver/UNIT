/**
 * Expo Router's useLocalSearchParams can return string | string[].
 * This normalizes to a single string (first element if array).
 */
export function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
