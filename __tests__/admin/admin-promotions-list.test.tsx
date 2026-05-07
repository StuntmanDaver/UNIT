import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminPromotionsClient } from '@/components/admin/AdminPromotionsClient'
import type { AdminPromotion } from '@/components/admin/PromotionReviewPanel'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/advertisers',
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams('propertyId=prop-1&filter=Approved&window=recent'),
}))

function buildPromotion(overrides: Partial<AdminPromotion> = {}): AdminPromotion {
  return {
    id: 'promo-1',
    property_id: 'prop-1',
    advertiser_id: 'adv-1',
    created_by_admin_id: null,
    business_name: 'Coffee Co',
    headline: 'Coffee launch',
    description: 'A promotion',
    image_url: null,
    cta_link: null,
    cta_text: null,
    review_status: 'approved',
    payment_status: 'paid',
    review_note: null,
    refund_reason: null,
    start_date: '2026-05-08',
    end_date: '2026-05-15',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('AdminPromotionsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applies the recent approved window when requested', () => {
    const oldDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()

    render(
      <AdminPromotionsClient
        properties={[{ id: 'prop-1', name: 'Riverfront Plaza' }]}
        promotions={[
          buildPromotion({ id: 'recent-1', headline: 'Recent approved promo' }),
          buildPromotion({ id: 'old-1', headline: 'Old approved promo', created_at: oldDate }),
        ]}
        selectedPropertyId="prop-1"
        selectedSegment="Approved"
        recentWindow
        segmentMode="review-status"
        showNewExternalAction={false}
      />
    )

    expect(screen.getByText('Recent approved promo')).toBeInTheDocument()
    expect(screen.queryByText('Old approved promo')).not.toBeInTheDocument()
    expect(screen.getByText(/last 30 days/i)).toBeInTheDocument()
  })

  it('preserves property context when changing filters', async () => {
    const user = userEvent.setup()

    render(
      <AdminPromotionsClient
        properties={[{ id: 'prop-1', name: 'Riverfront Plaza' }]}
        promotions={[buildPromotion()]}
        selectedPropertyId="prop-1"
        selectedSegment="Approved"
        segmentMode="review-status"
        showNewExternalAction={false}
      />
    )

    await user.click(screen.getByRole('tab', { name: 'Pending' }))

    expect(push).toHaveBeenCalledWith('/admin/advertisers?propertyId=prop-1&filter=Pending')
  })
})
