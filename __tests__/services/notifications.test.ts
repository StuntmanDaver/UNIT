import { notificationsService } from '../../services/notifications';

jest.mock('../../services/supabase', () => {
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
  };

  const query = new Proxy(mockChain, {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: (value: unknown) => void) =>
          resolve({ data: [], error: null });
      }
      return target[prop as keyof typeof target];
    },
  });

  return {
    supabase: {
      from: jest.fn(() => query),
    },
  };
});

describe('notificationsService', () => {
  it('exports expected methods', () => {
    expect(typeof notificationsService.filter).toBe('function');
    expect(typeof notificationsService.getUnreadCount).toBe('function');
    expect(typeof notificationsService.markAllRead).toBe('function');
  });
});
