import Constants from 'expo-constants';

export const TERMS_VERSION = '2026-05-12';

const extra = Constants.expoConfig?.extra as
  | {
      privacyPolicyUrl?: string;
      termsUrl?: string;
      accountDeletionUrl?: string;
    }
  | undefined;

export const policyUrls = {
  privacy: extra?.privacyPolicyUrl ?? 'https://ads.unit.app/privacy',
  terms: extra?.termsUrl ?? 'https://ads.unit.app/terms',
  accountDeletion: extra?.accountDeletionUrl ?? 'https://ads.unit.app/delete-account',
};
