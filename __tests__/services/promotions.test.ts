import { promotionsService } from '@/services/promotions';

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('promotionsService.getAdminList', () => {
  it('queries promotions with the given propertyId and statusFilter', async () => {
    const { supabase } = require('@/services/supabase');
    const mockEq = jest.fn().mockReturnThis();
    const mockIn = jest.fn().mockReturnThis();
    const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: mockEq,
      in: mockIn,
      order: mockOrder,
    });

    await promotionsService.getAdminList('prop-123', ['pending', 'approved']);

    expect(supabase.from).toHaveBeenCalledWith('promotions');
    expect(mockEq).toHaveBeenCalledWith('property_id', 'prop-123');
    expect(mockIn).toHaveBeenCalledWith('review_status', ['pending', 'approved']);
  });
});
