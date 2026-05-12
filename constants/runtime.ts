import Constants from 'expo-constants';

export type AppEnvironment = 'development' | 'staging' | 'production';

type RuntimeExtra = {
  appVariant?: string;
  environment?: string;
  releaseChannel?: string;
  supportEmail?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as RuntimeExtra;
const configuredScheme = Array.isArray(Constants.expoConfig?.scheme)
  ? Constants.expoConfig?.scheme[0]
  : Constants.expoConfig?.scheme;

export const appEnvironment = normalizeEnvironment(
  process.env.EXPO_PUBLIC_ENV ?? extra.environment ?? (__DEV__ ? 'development' : 'production')
);
export const appVariant = normalizeEnvironment(extra.appVariant ?? appEnvironment);
export const releaseChannel = extra.releaseChannel ?? appEnvironment;
export const supportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? extra.supportEmail ?? 'support@unitapp.com';
export const appDeepLinkBase = normalizeDeepLinkBase(
  process.env.EXPO_PUBLIC_APP_URL ?? `${configuredScheme ?? 'unit'}://`
);

export function buildAppDeepLink(path: string): string {
  return `${appDeepLinkBase}${path.replace(/^\/+/, '')}`;
}

export function getPublicHost(rawUrl: string | undefined): string {
  if (!rawUrl) return 'unset';

  try {
    return new URL(rawUrl).host;
  } catch {
    return 'invalid-url';
  }
}

function normalizeEnvironment(value: string): AppEnvironment {
  if (value === 'development' || value === 'staging' || value === 'production') {
    return value;
  }
  return 'production';
}

function normalizeDeepLinkBase(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (trimmed.endsWith('://') || trimmed.endsWith('/')) {
    return trimmed;
  }
  return `${trimmed}/`;
}
