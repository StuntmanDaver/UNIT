'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

export type AdvertiserAccountStatus = 'pending' | 'active' | 'suspended'

export type AdvertiserAccountRow = {
  id: string
  business_name: string
  contact_email: string
  status: AdvertiserAccountStatus
  stripe_customer_id: string | null
  created_at: string
  promotion_count?: number
}

export type AdvertiserAccountAdminActions = {
  approveAdvertiserAccount: (accountId: string) => Promise<void>
  suspendAdvertiserAccount: (accountId: string) => Promise<void>
  reactivateAdvertiserAccount: (accountId: string) => Promise<void>
}

type AdvertiserAccountsClientProps = {
  accounts: AdvertiserAccountRow[]
  initialStatus?: AdvertiserAccountStatus
  actions: AdvertiserAccountAdminActions
}

const STATUS_FILTERS: Array<{ value: AdvertiserAccountStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
]

export function AdvertiserAccountsClient({
  accounts,
  initialStatus = 'pending',
  actions,
}: AdvertiserAccountsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<AdvertiserAccountStatus>(initialStatus)
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  function updateStatus(nextStatus: AdvertiserAccountStatus): void {
    setStatus(nextStatus)
    const params = new URLSearchParams(searchParams.toString())
    params.set('status', nextStatus)
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  async function runAccountAction(
    account: AdvertiserAccountRow,
    actionName: 'approve' | 'suspend' | 'reactivate',
  ): Promise<void> {
    const key = `${account.id}:${actionName}`
    setPendingAction(key)
    try {
      if (actionName === 'approve') await actions.approveAdvertiserAccount(account.id)
      if (actionName === 'suspend') await actions.suspendAdvertiserAccount(account.id)
      if (actionName === 'reactivate') await actions.reactivateAdvertiserAccount(account.id)
      toast.success(`${account.business_name} updated`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update advertiser account')
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black">Advertiser Approval</h1>
        <p className="text-sm text-[#465A75]">Approve and manage advertiser access to promotion submission.</p>
      </header>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Advertiser account status">
        {STATUS_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`unit-btn ${status === option.value ? 'unit-btn-primary' : 'unit-btn-secondary'}`}
            aria-pressed={status === option.value}
            onClick={() => updateStatus(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {accounts.length === 0 ? (
        <div className="unit-card py-12 text-center text-sm text-[#465A75]">
          No {status} advertiser accounts.
        </div>
      ) : (
        <section className="space-y-3">
          {accounts.map((account) => (
            <article key={account.id} className="unit-card p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-black">{account.business_name}</h2>
                    <span className={statusClassName(account.status)}>{account.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-[#465A75]">{account.contact_email}</p>
                  <p className="mt-1 text-xs font-medium text-[#465A75]">
                    {account.promotion_count ?? 0} promotions
                    {account.stripe_customer_id ? ' - Stripe linked' : ' - No Stripe customer'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {account.status === 'pending' && (
                    <button
                      type="button"
                      className="unit-btn unit-btn-primary"
                      aria-label={`Approve ${account.business_name}`}
                      disabled={pendingAction === `${account.id}:approve`}
                      onClick={() => void runAccountAction(account, 'approve')}
                    >
                      Approve
                    </button>
                  )}
                  {account.status === 'active' && (
                    <button
                      type="button"
                      className="unit-btn unit-btn-danger"
                      aria-label={`Suspend ${account.business_name}`}
                      disabled={pendingAction === `${account.id}:suspend`}
                      onClick={() => void runAccountAction(account, 'suspend')}
                    >
                      Suspend
                    </button>
                  )}
                  {account.status === 'suspended' && (
                    <button
                      type="button"
                      className="unit-btn unit-btn-primary"
                      aria-label={`Reactivate ${account.business_name}`}
                      disabled={pendingAction === `${account.id}:reactivate`}
                      onClick={() => void runAccountAction(account, 'reactivate')}
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}

function statusClassName(status: AdvertiserAccountStatus): string {
  if (status === 'active') return 'unit-status bg-emerald-50 text-emerald-700'
  if (status === 'suspended') return 'unit-status bg-red-50 text-red-700'
  return 'unit-status bg-amber-50 text-amber-700'
}
