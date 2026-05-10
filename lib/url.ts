import { Linking } from 'react-native';

export function isHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function openHttpUrl(value: string | null | undefined): void {
  if (!isHttpUrl(value)) return;
  Linking.openURL(value).catch(() => {});
}
