import { describe, expect, it, vi } from 'vitest';
import {
  derivePromotionPaymentAttemptType,
  getActivePromotionPriceTiers,
} from '@/lib/promotions/payments';

describe('derivePromotionPaymentAttemptType', () => {
  it('allows initial payment only for unpaid drafts', () => {
    expect(derivePromotionPaymentAttemptType({
      review_status: 'draft',
      payment_status: 'unpaid',
    })).toBe('initial');
  });

  it('allows repayment only when revisions require repayment', () => {
    expect(derivePromotionPaymentAttemptType({
      review_status: 'revision_requested',
      payment_status: 'repayment_required',
    })).toBe('repayment');
  });

  it('rejects already-paid and invalid checkout states', () => {
    expect(derivePromotionPaymentAttemptType({
      review_status: 'draft',
      payment_status: 'paid',
    })).toBeNull();
    expect(derivePromotionPaymentAttemptType({
      review_status: 'revision_requested',
      payment_status: 'paid',
    })).toBeNull();
  });
});

describe('getActivePromotionPriceTiers', () => {
  it('queries only active price tiers ordered by price', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{
          id: 'tier-1',
          name: 'Standard',
          duration_days: 30,
          is_featured: false,
          price_cents: 4999,
          currency: 'usd',
          is_active: true,
        }],
        error: null,
      }),
    };
    const supabase = {
      from: vi.fn().mockReturnValue(query),
    };

    const tiers = await getActivePromotionPriceTiers(supabase);

    expect(supabase.from).toHaveBeenCalledWith('promotion_price_tiers');
    expect(query.eq).toHaveBeenCalledWith('is_active', true);
    expect(query.order).toHaveBeenCalledWith('price_cents', { ascending: true });
    expect(tiers).toHaveLength(1);
  });
});
