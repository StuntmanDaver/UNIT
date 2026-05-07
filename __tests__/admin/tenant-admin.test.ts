import { describe, expect, it } from 'vitest'
import { buildTenantCsvPreview } from '@/components/admin/TenantAdminClient'

describe('TenantAdminClient CSV helpers', () => {
  it('parses quoted commas and preserves optional tenant fields', () => {
    const preview = buildTenantCsvPreview([
      'email,business_name,category,contact_name,contact_phone,services,unit_number',
      'owner@example.com,"Consulting, LLC",professional,Jamie Lee,555-0100,"strategy, audits",12B',
    ].join('\n'))

    expect(preview.headerErrors).toEqual([])
    expect(preview.rows).toHaveLength(1)
    expect(preview.validRows).toEqual([
      {
        email: 'owner@example.com',
        business_name: 'Consulting, LLC',
        category: 'professional',
        contact_name: 'Jamie Lee',
        contact_phone: '555-0100',
        services: 'strategy, audits',
        unit_number: '12B',
      },
    ])
  })

  it('reports missing required headers before import', () => {
    const preview = buildTenantCsvPreview('email,business_name\nowner@example.com,Coffee Co')

    expect(preview.headerErrors).toEqual(['Missing required header: category'])
    expect(preview.validRows).toEqual([])
    expect(preview.rows[0]?._errors).toContain('Missing required header: category')
  })
})
