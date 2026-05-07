import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  PromotionReviewPanel,
  type AdminPromotion,
} from '@/components/admin/PromotionReviewPanel'

function buildPromotion(overrides: Partial<AdminPromotion> = {}): AdminPromotion {
  return {
    id: 'promo-1',
    property_id: 'property-1',
    advertiser_id: 'advertiser-1',
    created_by_admin_id: null,
    business_name: 'Coffee Co',
    headline: 'Free pastry with coffee',
    description: 'A tenant promotion awaiting review.',
    image_url: null,
    cta_link: null,
    cta_text: null,
    review_status: 'pending',
    payment_status: 'paid',
    review_note: null,
    refund_reason: null,
    start_date: '2026-05-08',
    end_date: '2026-05-15',
    created_at: '2026-05-07T00:00:00Z',
    ...overrides,
  }
}

describe('PromotionReviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('approves pending promotions without requiring a note', async () => {
    const user = userEvent.setup()
    const onReviewAction = vi.fn().mockResolvedValue(undefined)

    render(
      <PromotionReviewPanel
        promotion={buildPromotion()}
        onReviewAction={onReviewAction}
      />
    )

    await user.click(screen.getByRole('button', { name: /approve/i }))

    expect(onReviewAction).toHaveBeenCalledWith({
      promotionId: 'promo-1',
      action: 'approve',
    })
  })

  it('requires a note before allowing revision', async () => {
    const user = userEvent.setup()
    const onReviewAction = vi.fn().mockResolvedValue(undefined)

    render(
      <PromotionReviewPanel
        promotion={buildPromotion()}
        onReviewAction={onReviewAction}
      />
    )

    await user.click(screen.getByRole('button', { name: /allow revision/i }))
    await user.click(screen.getByRole('button', { name: /submit action/i }))

    expect(screen.getByText(/a note is required/i)).toBeInTheDocument()
    expect(onReviewAction).not.toHaveBeenCalled()

    await user.type(
      screen.getByLabelText(/admin note/i),
      'Please replace the image with a tenant-safe graphic.'
    )
    await user.click(screen.getByRole('button', { name: /submit action/i }))

    expect(onReviewAction).toHaveBeenCalledWith({
      promotionId: 'promo-1',
      action: 'allow_revision',
      note: 'Please replace the image with a tenant-safe graphic.',
    })
  })

  it('issues refunds only after a reason is supplied', async () => {
    const user = userEvent.setup()
    const onIssueRefund = vi.fn().mockResolvedValue(undefined)

    render(
      <PromotionReviewPanel
        promotion={buildPromotion({ review_status: 'rejected' })}
        onIssueRefund={onIssueRefund}
      />
    )

    await user.click(screen.getByRole('button', { name: /issue refund/i }))
    await user.click(screen.getByRole('button', { name: /submit refund/i }))

    expect(screen.getByText(/a refund reason is required/i)).toBeInTheDocument()
    expect(onIssueRefund).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText(/refund reason/i), 'Rejected before campaign launch.')
    await user.click(screen.getByRole('button', { name: /submit refund/i }))

    expect(onIssueRefund).toHaveBeenCalledWith({
      promotionId: 'promo-1',
      reason: 'Rejected before campaign launch.',
    })
  })

  it('surfaces payment anomalies for paid promotions', () => {
    render(
      <PromotionReviewPanel
        promotion={buildPromotion()}
        paymentAnomaly
      />
    )

    expect(screen.getByRole('alert')).toHaveTextContent(/no completed payment record/i)
  })
})
