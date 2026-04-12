// __tests__/services/analytics.test.ts
import { analyticsService } from '@/services/analytics';

const mockInsert = jest.fn().mockResolvedValue({ error: null });
jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({ insert: mockInsert })),
  },
}));

describe('analyticsService.recordView', () => {
  beforeEach(() => jest.clearAllMocks());

  it('inserts a view event', async () => {
    const { supabase } = require('@/services/supabase');
    await analyticsService.recordView('promo-1', 'tenant-1', 'prop-1', 'sess-abc');
    expect(supabase.from).toHaveBeenCalledWith('ad_analytics');
    expect(mockInsert).toHaveBeenCalledWith({
      promotion_id: 'promo-1',
      tenant_id: 'tenant-1',
      property_id: 'prop-1',
      session_id: 'sess-abc',
      event_type: 'view',
    });
  });

  it('does not throw if insert returns a Postgres 23505 duplicate error', async () => {
    mockInsert.mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate' } });
    // Should swallow the unique constraint violation (dedup) — no throw
    await expect(
      analyticsService.recordView('promo-1', 'tenant-1', 'prop-1', 'sess-abc')
    ).resolves.not.toThrow();
  });

  it('throws on non-dedup database errors', async () => {
    mockInsert.mockResolvedValueOnce({ error: { code: '42P01', message: 'table missing' } });
    await expect(
      analyticsService.recordView('promo-1', 'tenant-1', 'prop-1', 'sess-abc')
    ).rejects.toThrow();
  });
});
