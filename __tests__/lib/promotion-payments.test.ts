import { describe, expect, it, vi } from 'vitest';
import {
  canPayForPromotion,
  derivePromotionPaymentAttemptType,
  getActivePromotionPriceTier,
  getActivePromotionPriceTiers,
} from '@/lib/promotions/payments';

function createPriceTierQuery(result: unknown) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: unknown) => void) => resolve(result),
  };
  return query;
}

describe('promotion payment helpers', () => {
  it('derives initial payment attempts for draft unpaid promotions', () => {
    expect(derivePromotionPaymentAttemptType({ review_status: 'draft', payment_status: 'unpaid' })).toBe('initial');
    expect(canPayForPromotion({ review_status: 'draft', payment_status: 'unpaid' })).toBe(true);
  });

  it('derives repayment attempts for revision-requested repayment-required promotions', () => {
    expect(derivePromotionPaymentAttemptType({ review_status: 'revision_requested', payment_status: 'repayment_required' })).toBe('repayment');
    expect(canPayForPromotion({ review_status: 'revision_requested', payment_status: 'repayment_required' })).toBe(true);
  });

  it('rejects non-payable promotion states', () => {
    expect(derivePromotionPaymentAttemptType({ review_status: 'approved', payment_status: 'paid' })).toBeNull();
    expect(canPayForPromotion({ review_status: 'approved', payment_status: 'paid' })).toBe(false);
  });

  it('loads active price tiers ordered by price', async () => {
    const query = createPriceTierQuery({ data: [{ id: 'tier-1' }], error: null });
    const supabase = { from: vi.fn(() => query) };

    await expect(getActivePromotionPriceTiers(supabase as never)).resolves.toEqual([{ id: 'tier-1' }]);
    expect(supabase.from).toHaveBeenCalledWith('promotion_price_tiers');
    expect(query.eq).toHaveBeenCalledWith('is_active', true);
    expect(query.order).toHaveBeenCalledWith('price_cents', { ascending: true });
  });

  it('loads a single active price tier by id', async () => {
    const query = createPriceTierQuery({ data: { id: 'tier-1' }, error: null });
    const supabase = { from: vi.fn(() => query) };

    await expect(getActivePromotionPriceTier(supabase as never, 'tier-1')).resolves.toEqual({ id: 'tier-1' });
    expect(query.eq).toHaveBeenCalledWith('id', 'tier-1');
    expect(query.eq).toHaveBeenCalledWith('is_active', true);
  });
});
