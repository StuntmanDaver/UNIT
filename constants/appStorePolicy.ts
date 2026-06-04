import { Platform } from 'react-native';
import { appEnvironment } from '@/constants/runtime';

export const isIosProductionAppStoreBuild =
  Platform.OS === 'ios' && appEnvironment === 'production';

export const iosPromotionPaymentsDisabledMessage =
  'Paid promotion purchases are temporarily unavailable in the iOS app while UNIT completes App Store payment compliance.';
