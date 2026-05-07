import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { PromotionCTA } from '@/components/PromotionCTA'
import type { Promotion } from '@/lib/supabase/types'

const push = vi.fn()
const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

function buildPromotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: 'promo-1',
    property_id: 'property-1',
    advertiser_id: 'advertiser-1',
    business_name: 'Coffee Co',
    headline: 'Free pastry with coffee',
    description: null,
    image_url: null,
    cta_link: null,
    cta_text: null,
    review_status: 'revision_requested',
    payment_status: 'repayment_required',
    review_note: null,
    start_date: '2026-05-08',
    end_date: '2026-05-15',
    created_at: '2026-05-07T00:00:00Z',
    ...overrides,
  }
}

describe('PromotionCTA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('routes repayment-required promotions to review so advertisers can pick a tier', async () => {
    const user = userEvent.setup()
    render(<PromotionCTA promotion={buildPromotion()} />)

    await user.click(screen.getByRole('button', { name: /choose a plan to resubmit/i }))

    expect(push).toHaveBeenCalledWith('/promotions/new/review?id=promo-1&repayment=true')
    expect(fetch).not.toHaveBeenCalled()
  })
})
