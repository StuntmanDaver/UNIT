import { promotionsService } from '@/services/promotions';

// Shared chainable mock — extended to cover update/insert/gt/limit
const mockChain = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  insert: jest.fn().mockResolvedValue({ error: null }),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
};

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockChain),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  // Reset all chain methods to return 'this' by default
  Object.keys(mockChain).forEach((key) => {
    const k = key as keyof typeof mockChain;
    if (k !== 'single' && k !== 'insert') {
      (mockChain[k] as jest.Mock).mockReturnThis();
    }
  });
  mockChain.insert.mockResolvedValue({ error: null });
  mockChain.single.mockResolvedValue({ data: null, error: null });
});

// ─── getAdminList ───────────────────────────────────────────────────────────

describe('promotionsService.getAdminList', () => {
  it('queries promotions with the given propertyId and statusFilter', async () => {
    const { supabase } = require('@/services/supabase');
    mockChain.order.mockResolvedValue({ data: [], error: null });

    await promotionsService.getAdminList('prop-123', ['pending', 'approved']);

    expect(supabase.from).toHaveBeenCalledWith('promotions');
    expect(mockChain.eq).toHaveBeenCalledWith('property_id', 'prop-123');
    expect(mockChain.in).toHaveBeenCalledWith('review_status', ['pending', 'approved']);
  });
});

// ─── applyReviewAction ──────────────────────────────────────────────────────

describe('promotionsService.applyReviewAction', () => {
  it('approve — updates review_status to approved and inserts status event', async () => {
    const { supabase } = require('@/services/supabase');
    mockChain.eq.mockResolvedValue({ error: null });

    await promotionsService.applyReviewAction(
      'promo-1',
      'admin-1',
      { review_status: 'pending', payment_status: 'paid' },
      { action: 'approve' }
    );

    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ review_status: 'approved' })
    );
    expect(supabase.from).toHaveBeenCalledWith('promotion_status_events');
    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        to_review_status: 'approved',
        actor_type: 'admin',
        actor_user_id: 'admin-1',
      })
    );
  });

  it('reject — sets review_status to rejected and passes note to status event', async () => {
    mockChain.eq.mockResolvedValue({ error: null });

    await promotionsService.applyReviewAction(
      'promo-1',
      'admin-1',
      { review_status: 'pending', payment_status: 'paid' },
      { action: 'reject', note: 'Does not meet guidelines' }
    );

    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ review_status: 'rejected' })
    );
    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        to_review_status: 'rejected',
        note: 'Does not meet guidelines',
      })
    );
  });
});

// ─── toggleSuspend ──────────────────────────────────────────────────────────

describe('promotionsService.toggleSuspend', () => {
  it('flips approved → suspended and inserts a status event', async () => {
    const { supabase } = require('@/services/supabase');
    mockChain.eq.mockResolvedValue({ error: null });

    await promotionsService.toggleSuspend('promo-1', 'admin-1', 'approved');

    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ review_status: 'suspended' })
    );
    expect(supabase.from).toHaveBeenCalledWith('promotion_status_events');
    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        from_review_status: 'approved',
        to_review_status: 'suspended',
        actor_type: 'admin',
      })
    );
  });
});

// ─── getLiveForProperty ─────────────────────────────────────────────────────

describe('promotionsService.getLiveForProperty', () => {
  it('filters by approved status and active date range', async () => {
    mockChain.order.mockResolvedValue({ data: [], error: null });

    await promotionsService.getLiveForProperty('prop-456');

    expect(mockChain.eq).toHaveBeenCalledWith('review_status', 'approved');
    expect(mockChain.eq).toHaveBeenCalledWith('property_id', 'prop-456');
    expect(mockChain.lte).toHaveBeenCalled();
    expect(mockChain.gt).toHaveBeenCalled();
  });
});
