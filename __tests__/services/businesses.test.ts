import { businessesService } from '../../services/businesses';

jest.mock('../../services/supabase', () => {
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
  };

  // Make the chain thenable so await works
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

describe('businessesService', () => {
  it('exports expected methods', () => {
    expect(typeof businessesService.filter).toBe('function');
    expect(typeof businessesService.getById).toBe('function');
    expect(typeof businessesService.create).toBe('function');
    expect(typeof businessesService.update).toBe('function');
  });
});
