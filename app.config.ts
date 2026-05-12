import type { ExpoConfig } from 'expo/config';

type AppVariant = 'development' | 'staging' | 'production';

const EAS_PROJECT_ID = '1a4f5cf7-5e70-4c3e-8121-e1c356f19d51';

const variant = getAppVariant();

const variantConfig: Record<AppVariant, {
  name: string;
  slug: string;
  scheme: string;
  bundleIdentifier: string;
  androidPackage: string;
  releaseChannel: string;
}> = {
  development: {
    name: 'UNIT Dev',
    slug: 'unit-app-dev',
    scheme: 'unit-dev',
    bundleIdentifier: 'com.unitapp.mobile.dev',
    androidPackage: 'com.unitapp.mobile.dev',
    releaseChannel: 'development',
  },
  staging: {
    name: 'UNIT Staging',
    slug: 'unit-app-staging',
    scheme: 'unit-staging',
    bundleIdentifier: 'com.unitapp.mobile.staging',
    androidPackage: 'com.unitapp.mobile.staging',
    releaseChannel: 'staging',
  },
  production: {
    name: 'UNIT',
    slug: 'unit-app',
    scheme: 'unit',
    bundleIdentifier: 'com.unitapp.mobile',
    androidPackage: 'com.unitapp.mobile',
    releaseChannel: 'production',
  },
};

const selected = variantConfig[variant];

const config: ExpoConfig = {
  name: selected.name,
  slug: selected.slug,
  version: '1.0.0',
  orientation: 'portrait',
  runtimeVersion: {
    policy: 'sdkVersion',
  },
  updates: {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    enabled: true,
    fallbackToCacheTimeout: 0,
    checkAutomatically: 'ON_LOAD',
  },
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: selected.scheme,
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: selected.bundleIdentifier,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#f5f5f7',
    },
    package: selected.androidPackage,
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F4F5F7',
        image: './assets/unit-logo-light.png',
        imageWidth: 240,
        resizeMode: 'contain',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'UNIT needs photo library access to upload your business logo.',
        cameraPermission: 'UNIT needs camera access to take photos for your business profile.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#101B29',
      },
    ],
    '@sentry/react-native',
    'expo-font',
    '@react-native-community/datetimepicker',
    'expo-web-browser',
  ],
  extra: {
    router: {},
    eas: {
      projectId: EAS_PROJECT_ID,
    },
    appVariant: variant,
    environment: getRuntimeEnvironment(variant),
    releaseChannel: selected.releaseChannel,
    supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@unitapp.com',
  },
  owner: 'stuntmandaver',
};

export default config;

function getAppVariant(): AppVariant {
  const raw = process.env.APP_VARIANT ?? process.env.EXPO_PUBLIC_ENV ?? 'production';
  if (raw === 'development' || raw === 'staging' || raw === 'production') {
    return raw;
  }
  return 'production';
}

function getRuntimeEnvironment(appVariant: AppVariant): AppVariant {
  const raw = process.env.EXPO_PUBLIC_ENV;
  if (raw === 'development' || raw === 'staging' || raw === 'production') {
    return raw;
  }
  return appVariant;
}
