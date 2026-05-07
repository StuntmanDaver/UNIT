import { createElement } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdvertiserAccountsClient } from '@/components/admin/AdvertiserAccountsClient'
import type { AdvertiserAccountRow } from '@/components/admin/AdvertiserAccountsClient'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
  usePathname: () => '/admin/advertiser-accounts',
  useSearchParams: () => new URLSearchParams('status=pending'),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

function buildAccount(overrides: Partial<AdvertiserAccountRow> = {}): AdvertiserAccountRow {
  return {
    id: 'adv-1',
    business_name: 'Coffee Co',
    contact_email: 'owner@example.com',
    status: 'pending',
    stripe_customer_id: null,
    created_at: '2026-05-07T00:00:00Z',
    promotion_count: 0,
    ...overrides,
  }
}

describe('AdvertiserAccountsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders only valid account actions for pending, active, and suspended statuses', () => {
    render(createElement(AdvertiserAccountsClient, {
      accounts: [
        buildAccount({ id: 'pending-1', status: 'pending', business_name: 'Pending Co' }),
        buildAccount({ id: 'active-1', status: 'active', business_name: 'Active Co' }),
        buildAccount({ id: 'suspended-1', status: 'suspended', business_name: 'Suspended Co' }),
      ],
      initialStatus: 'pending',
      actions: {
        approveAdvertiserAccount: vi.fn(),
        suspendAdvertiserAccount: vi.fn(),
        reactivateAdvertiserAccount: vi.fn(),
      },
    }))

    expect(screen.getByRole('button', { name: /approve pending co/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /suspend active co/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reactivate suspended co/i })).toBeInTheDocument()
  })

  it('calls approve action with the account id', async () => {
    const user = userEvent.setup()
    const approveAdvertiserAccount = vi.fn().mockResolvedValue(undefined)

    render(createElement(AdvertiserAccountsClient, {
      accounts: [buildAccount()],
      initialStatus: 'pending',
      actions: {
        approveAdvertiserAccount,
        suspendAdvertiserAccount: vi.fn(),
        reactivateAdvertiserAccount: vi.fn(),
      },
    }))

    await user.click(screen.getByRole('button', { name: /approve coffee co/i }))

    expect(approveAdvertiserAccount).toHaveBeenCalledWith('adv-1')
    expect(refresh).toHaveBeenCalled()
  })
})
