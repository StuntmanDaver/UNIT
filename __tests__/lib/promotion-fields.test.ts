import { describe, expect, it } from 'vitest';
import { normalizeAdvertiserPromotionFields } from '@/lib/promotions/fields';

describe('normalizeAdvertiserPromotionFields', () => {
  it('trims advertiser-editable promotion fields and normalizes blanks to null', () => {
    expect(normalizeAdvertiserPromotionFields({
      headline: '  Lunch special  ',
      description: '   ',
      startDate: ' 2026-06-01 ',
      endDate: ' 2026-06-30 ',
      imageUrl: ' https://example.com/banner.png ',
      ctaText: '',
      ctaLink: ' https://example.com/menu ',
    })).toEqual({
      headline: 'Lunch special',
      description: null,
      start_date: '2026-06-01',
      end_date: '2026-06-30',
      image_url: 'https://example.com/banner.png',
      cta_text: null,
      cta_link: 'https://example.com/menu',
    });
  });

  it('rejects promotion date ranges where the end date is not after the start date', () => {
    expect(() => normalizeAdvertiserPromotionFields({
      headline: 'Lunch special',
      startDate: '2026-06-30',
      endDate: '2026-06-30',
    })).toThrow('End date must be after start date');
  });
});
