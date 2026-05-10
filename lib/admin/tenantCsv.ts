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

type TenantCsvExportRow = {
  profile: {
    email: string | null
    status: string
  }
  business: {
    business_name: string | null
    category: string | null
    contact_name?: string | null
    contact_phone?: string | null
    services?: string | null
    unit_number?: string | null
  } | null
}

const REQUIRED_HEADERS = ['email', 'business_name', 'category'] as const
const OPTIONAL_HEADERS = ['contact_name', 'contact_phone', 'services', 'unit_number'] as const

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

export function buildTenantCsvExport(tenants: TenantCsvExportRow[]): string {
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
  return [
    ['email', 'business_name', 'category', 'status', 'contact_name', 'contact_phone', 'services', 'unit_number'],
    ...rows,
  ].map((row) => row.map(escapeCsvCell).join(',')).join('\n')
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

function escapeCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}
