const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
  },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { eas: { projectId: undefined } } },
}));

jest.mock('../../services/push', () => ({
  pushService: {
    registerToken: jest.fn(),
    unregisterToken: jest.fn(),
  },
}));

import { handleNotificationResponse } from '../../hooks/usePushNotifications';

type PushType = 'post' | 'offer' | 'promotion' | 'advertiser_approved' | 'broadcast' | 'unknown';

function response(type?: PushType) {
  return {
    notification: {
      request: {
        content: {
          data: type ? { type } : null,
        },
      },
    },
  } as unknown as Parameters<typeof handleNotificationResponse>[0];
}

describe('handleNotificationResponse deep-link routing', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('routes post → community tab', () => {
    handleNotificationResponse(response('post'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/community');
  });

  it.each<PushType>(['offer', 'promotion', 'advertiser_approved'])(
    'routes %s → promotions tab',
    (type) => {
      handleNotificationResponse(response(type));
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/promotions');
    },
  );

  it('routes broadcast → notifications tab (explicit case)', () => {
    handleNotificationResponse(response('broadcast'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/notifications');
  });

  it('routes unknown type → notifications tab (default)', () => {
    handleNotificationResponse(response('unknown'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/notifications');
  });

  it('routes payload without type → notifications tab (default)', () => {
    handleNotificationResponse(response());
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/notifications');
  });
});
