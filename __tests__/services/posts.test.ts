import { postsService } from '../../services/posts';

jest.mock('../../services/supabase', () => {
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
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

describe('postsService', () => {
  it('exports expected methods', () => {
    expect(typeof postsService.filter).toBe('function');
    expect(typeof postsService.getById).toBe('function');
    expect(typeof postsService.create).toBe('function');
    expect(typeof postsService.update).toBe('function');
    expect(typeof postsService.delete).toBe('function');
  });
});
