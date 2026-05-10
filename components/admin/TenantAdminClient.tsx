'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import type { FormEvent } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

export type TenantStatus = 'invited' | 'active' | 'inactive'
export type TenantStatusFilter = 'all' | TenantStatus

export type AdminPropertyOption = {
  id: string
  name: string
}

export type TenantAdminRow = {
  profile: {
    id: string
    email: string | null
    status: TenantStatus
    display_name?: string | null
    full_name?: string | null
    invited_at?: string | null
    activated_at?: string | null
    created_at?: string | null
  }
  business: {
    id?: string
    business_name: string | null
    category: string | null
    contact_name?: string | null
    contact_phone?: string | null
    services?: string | null
    unit_number?: string | null
  } | null
}

export type TenantImportActionInput = {
  email: string
  business_name: string
  category: string
  contact_name?: string
  contact_phone?: string
  services?: string
  unit_number?: string
  property_id: string
}

export type TenantInviteActionInput = TenantImportActionInput

export type TenantActionResult = {
  ok?: boolean
  message?: string
}

export type TenantImportActionResult = {
  imported: number
  failed: Array<{ email: string; reason: string }>
  total: number
}

export type TenantAdminActions = {
  inviteTenant: (input: TenantInviteActionInput) => Promise<TenantActionResult | void>
  importTenants: (rows: TenantImportActionInput[]) => Promise<TenantImportActionResult | void>
  disableTenant: (profileId: string) => Promise<TenantActionResult | void>
  reactivateTenant: (profileId: string) => Promise<TenantActionResult | void>
}

export type TenantCsvParsedRow = {
  email: string
  business_name: string
  category: string
  contact_name?: string
  contact_phone?: string
  services?: string
  unit_number?: string
  _rowIndex: number
  _isValid: boolean
  _errors: string[]
}

export type TenantCsvPreview = {
  headerErrors: string[]
  rows: TenantCsvParsedRow[]
  validRows: Array<Omit<TenantCsvParsedRow, '_rowIndex' | '_isValid' | '_errors'>>
}

type TenantAdminClientProps = {
  properties: AdminPropertyOption[]
  tenants: TenantAdminRow[]
  selectedPropertyId?: string | null
  initialStatus?: TenantStatusFilter
  initialSearch?: string
  actions: TenantAdminActions
}

const REQUIRED_HEADERS = ['email', 'business_name', 'category'] as const
const OPTIONAL_HEADERS = ['contact_name', 'contact_phone', 'services', 'unit_number'] as const
const STATUS_FILTERS: Array<{ value: TenantStatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'invited', label: 'Invited' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

export function buildTenantCsvPreview(csvText: string): TenantCsvPreview {
  const matrix = parseCsvMatrix(csvText)
  const [headerRow, ...dataRows] = matrix
  const headers = (headerRow ?? []).map(normalizeHeader)
  const headerErrors = REQUIRED_HEADERS
    .filter((header) => !headers.includes(header))
    .map((header) => `Missing required header: ${header}`)

  const rows = dataRows
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row, index) => {
      const record = Object.fromEntries(headers.map((header, cellIndex) => [header, row[cellIndex] ?? '']))
      return validateTenantCsvRow(record, index, headerErrors)
    })

  return {
    headerErrors,
    rows,
    validRows: headerErrors.length > 0
      ? []
      : rows.filter((row) => row._isValid).map(stripCsvDiagnostics),
  }
}

export function TenantAdminClient({
  properties,
  tenants,
  selectedPropertyId,
  initialStatus = 'all',
  initialSearch = '',
  actions,
}: TenantAdminClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [propertyId, setPropertyId] = useState(selectedPropertyId ?? '')
  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState<TenantStatusFilter>(initialStatus)
  const [csvPreview, setCsvPreview] = useState<TenantCsvPreview | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [actionKey, setActionKey] = useState<string | null>(null)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    business_name: '',
    category: '',
  })

  const activeProperty = properties.find((property) => property.id === propertyId)
  const filteredTenants = useMemo(() => {
    const query = search.trim().toLowerCase()
    return tenants.filter((tenant) => {
      if (status !== 'all' && tenant.profile.status !== status) return false
      if (!query) return true
      const values = [
        tenant.profile.email,
        tenant.profile.display_name,
        tenant.profile.full_name,
        tenant.business?.business_name,
        tenant.business?.category,
        tenant.business?.unit_number,
      ]
      return values.some((value) => value?.toLowerCase().includes(query))
    })
  }, [search, status, tenants])

  const validImportCount = csvPreview?.validRows.length ?? 0

  function updateProperty(nextPropertyId: string): void {
    setPropertyId(nextPropertyId)
    const params = new URLSearchParams(searchParams.toString())
    if (nextPropertyId) params.set('propertyId', nextPropertyId)
    else params.delete('propertyId')
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  async function handleCsvFile(file: File | undefined): Promise<void> {
    if (!file) return
    const text = await file.text()
    setCsvPreview(buildTenantCsvPreview(text))
  }

  async function runAction(key: string, action: () => Promise<void>, successMessage: string): Promise<void> {
    setActionKey(key)
    try {
      await action()
      toast.success(successMessage)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Admin action failed')
    } finally {
      setActionKey(null)
    }
  }

  async function submitInvite(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!propertyId) {
      toast.error('Select a property before inviting tenants')
      return
    }
    await runAction(
      'invite',
      async () => {
        await actions.inviteTenant({
          email: inviteForm.email.trim(),
          business_name: inviteForm.business_name.trim(),
          category: inviteForm.category.trim(),
          property_id: propertyId,
        })
        setInviteForm({ email: '', business_name: '', category: '' })
        setInviteOpen(false)
      },
      'Tenant invite sent',
    )
  }

  async function submitImport(): Promise<void> {
    if (!csvPreview || !propertyId || validImportCount === 0) return
    await runAction(
      'import',
      async () => {
        const result = await actions.importTenants(
          csvPreview.validRows.map((row) => ({ ...row, property_id: propertyId })),
        )
        if (result?.failed?.length) {
          toast.error(`${result.failed.length} tenant imports failed`)
        }
        setCsvPreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      },
      'Tenant import complete',
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black">Tenants</h1>
          <p className="mt-1 text-sm text-[#465A75]">
            {activeProperty ? `Managing ${activeProperty.name}` : 'Select a property to manage tenant accounts.'}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="unit-btn unit-btn-secondary"
            onClick={() => exportTenantCsv(filteredTenants)}
          >
            Export CSV
          </button>
          <button type="button" className="unit-btn unit-btn-primary" onClick={() => setInviteOpen(true)}>
            Add Tenant
          </button>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-[minmax(14rem,18rem)_1fr]">
        <label>
          <span className="unit-label">Property</span>
          <select
            className="unit-input"
            aria-label="Property"
            value={propertyId}
            onChange={(event) => updateProperty(event.target.value)}
          >
            <option value="">Select a property</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="unit-label">Search</span>
          <input
            className="unit-input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tenants"
          />
        </label>
      </section>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Tenant status">
        {STATUS_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`unit-btn ${status === option.value ? 'unit-btn-primary' : 'unit-btn-secondary'}`}
            aria-pressed={status === option.value}
            onClick={() => setStatus(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <section className="unit-card p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black">CSV Import</h2>
            <p className="mt-1 text-sm text-[#465A75]">
              Required headers: email, business_name, category. Optional: contact_name, contact_phone, services, unit_number.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="unit-input md:max-w-xs"
            aria-label="Choose tenant CSV"
            onChange={(event) => {
              startTransition(() => {
                void handleCsvFile(event.target.files?.[0])
              })
            }}
          />
        </div>

        {csvPreview && (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-[#E5E7EB] bg-[#F4F5F7] p-3 text-sm">
              <strong>{csvPreview.rows.length}</strong> rows found, <strong>{validImportCount}</strong> valid.
            </div>
            {[...csvPreview.headerErrors, ...csvPreview.rows.flatMap((row) => row._errors.map((error) => `Row ${row._rowIndex + 2}: ${error}`))]
              .slice(0, 8)
              .map((error) => (
                <p key={error} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ))}
            <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#F4F5F7] text-xs uppercase text-[#465A75]">
                  <tr>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Business</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {csvPreview.rows.slice(0, 10).map((row) => (
                    <tr key={`${row.email}-${row._rowIndex}`} className="border-t border-[#E5E7EB]">
                      <td className="px-3 py-2">{row.email || '(missing)'}</td>
                      <td className="px-3 py-2">{row.business_name || '(missing)'}</td>
                      <td className="px-3 py-2">{row.category || '(missing)'}</td>
                      <td className="px-3 py-2">{row.unit_number ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="unit-btn unit-btn-primary"
                disabled={!propertyId || validImportCount === 0 || actionKey === 'import' || isPending}
                onClick={() => void submitImport()}
              >
                Import {validImportCount} Valid Rows
              </button>
              <button type="button" className="unit-btn unit-btn-secondary" onClick={() => setCsvPreview(null)}>
                Clear Preview
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        {filteredTenants.length === 0 ? (
          <div className="unit-card py-12 text-center text-sm text-[#465A75]">No tenants match the current filters.</div>
        ) : (
          filteredTenants.map((tenant) => {
            const businessName = tenant.business?.business_name || 'Unclaimed business'
            const isInactive = tenant.profile.status === 'inactive'
            const isInvited = tenant.profile.status === 'invited'
            const buttonLabel = isInvited
              ? `Approve ${businessName}`
              : isInactive
                ? `Reactivate ${businessName}`
                : `Disable ${businessName}`
            return (
              <article key={tenant.profile.id} className="unit-card p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-black">{businessName}</h2>
                      <span className={statusClassName(tenant.profile.status)}>{tenant.profile.status}</span>
                    </div>
                    <p className="mt-1 text-sm text-[#465A75]">{tenant.profile.email}</p>
                    <p className="mt-1 text-sm text-[#465A75]">
                      {[tenant.business?.category, tenant.business?.unit_number ? `Unit ${tenant.business.unit_number}` : null]
                        .filter(Boolean)
                        .join(' - ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`unit-btn ${isInactive || isInvited ? 'unit-btn-primary' : 'unit-btn-danger'}`}
                    aria-label={buttonLabel}
                    disabled={actionKey === tenant.profile.id}
                    onClick={() => void runAction(
                      tenant.profile.id,
                      () => isInactive || isInvited
                        ? actions.reactivateTenant(tenant.profile.id).then(() => undefined)
                        : actions.disableTenant(tenant.profile.id).then(() => undefined),
                      isInvited ? 'Tenant approved' : isInactive ? 'Tenant reactivated' : 'Tenant disabled',
                    )}
                  >
                    {isInvited ? 'Approve' : isInactive ? 'Reactivate' : 'Disable'}
                  </button>
                </div>
              </article>
            )
          })
        )}
      </section>

      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101B29]/45 p-4" role="dialog" aria-modal="true" aria-labelledby="tenant-invite-title">
          <form className="unit-card w-full max-w-lg p-5" onSubmit={(event) => void submitInvite(event)}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="tenant-invite-title" className="text-lg font-black">Add Tenant</h2>
                <p className="mt-1 text-sm text-[#465A75]">Send a single tenant invitation.</p>
              </div>
              <button type="button" className="unit-btn unit-btn-secondary" onClick={() => setInviteOpen(false)}>
                Close
              </button>
            </div>
            <div className="space-y-3">
              <label>
                <span className="unit-label">Email *</span>
                <input
                  className="unit-input"
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label>
                <span className="unit-label">Business Name *</span>
                <input
                  className="unit-input"
                  required
                  value={inviteForm.business_name}
                  onChange={(event) => setInviteForm((current) => ({ ...current, business_name: event.target.value }))}
                />
              </label>
              <label>
                <span className="unit-label">Category *</span>
                <input
                  className="unit-input"
                  required
                  value={inviteForm.category}
                  onChange={(event) => setInviteForm((current) => ({ ...current, category: event.target.value }))}
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="unit-btn unit-btn-secondary" onClick={() => setInviteOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="unit-btn unit-btn-primary" disabled={actionKey === 'invite'}>
                Send Invite
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, '_')
}

function validateTenantCsvRow(
  record: Record<string, string>,
  index: number,
  headerErrors: string[],
): TenantCsvParsedRow {
  const row = {
    email: requiredCell(record.email),
    business_name: requiredCell(record.business_name),
    category: requiredCell(record.category).toLowerCase(),
    contact_name: optionalCell(record.contact_name),
    contact_phone: optionalCell(record.contact_phone),
    services: optionalCell(record.services),
    unit_number: optionalCell(record.unit_number),
  }
  const errors = [...headerErrors]
  if (!row.email) errors.push('email required')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('Invalid email')
  if (!row.business_name) errors.push('business_name required')
  if (!row.category) errors.push('category required')

  return {
    ...row,
    _rowIndex: index,
    _isValid: errors.length === 0,
    _errors: errors,
  }
}

function stripCsvDiagnostics(row: TenantCsvParsedRow): Omit<TenantCsvParsedRow, '_rowIndex' | '_isValid' | '_errors'> {
  const clean: Omit<TenantCsvParsedRow, '_rowIndex' | '_isValid' | '_errors'> = {
    email: row.email,
    business_name: row.business_name,
    category: row.category,
  }
  for (const field of OPTIONAL_HEADERS) {
    const value = row[field]
    if (value) clean[field] = value
  }
  return clean
}

function requiredCell(value: string | undefined): string {
  return (value ?? '').trim()
}

function optionalCell(value: string | undefined): string | undefined {
  const trimmed = (value ?? '').trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function parseCsvMatrix(csvText: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i]
    const next = csvText[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell)
      cell = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows
}

function exportTenantCsv(tenants: TenantAdminRow[]): void {
  const rows = tenants.map((tenant) => [
    tenant.profile.email ?? '',
    tenant.business?.business_name ?? '',
    tenant.business?.category ?? '',
    tenant.profile.status,
    tenant.business?.contact_name ?? '',
    tenant.business?.contact_phone ?? '',
    tenant.business?.services ?? '',
    tenant.business?.unit_number ?? '',
  ])
  const csv = [
    ['email', 'business_name', 'category', 'status', 'contact_name', 'contact_phone', 'services', 'unit_number'],
    ...rows,
  ].map((row) => row.map(escapeCsvCell).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'tenants_export.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

function escapeCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function statusClassName(status: TenantStatus): string {
  if (status === 'active') return 'unit-status bg-emerald-50 text-emerald-700'
  if (status === 'inactive') return 'unit-status bg-red-50 text-red-700'
  return 'unit-status bg-amber-50 text-amber-700'
}
