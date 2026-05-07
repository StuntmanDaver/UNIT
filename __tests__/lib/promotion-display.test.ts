import { describe, expect, it } from 'vitest'
import { formatPrice, getReviewHref } from '@/lib/promotion-display'

describe('promotion display helpers', () => {
  it('formats a tier price with its database currency', () => {
    expect(formatPrice({ price_cents: 12500, currency: 'usd' })).toBe('$125.00')
  })

  it('builds review hrefs for initial payment and repayment flows', () => {
    expect(getReviewHref('promo 1')).toBe('/promotions/new/review?id=promo+1')
    expect(getReviewHref('promo 1', { repayment: true })).toBe(
      '/promotions/new/review?id=promo+1&repayment=true'
    )
  })
})
