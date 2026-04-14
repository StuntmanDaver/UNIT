import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/server before importing the route
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      })
    ),
  },
}))

const mockServiceClient = {
  from: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
}

const mockUserClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue(mockUserClient),
  createServiceRoleClient: vi.fn().mockReturnValue(mockServiceClient),
}))

describe('POST /api/resubmit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockUserClient.auth.getUser.mockResolvedValue({ data: { user: null } })

    const { POST } = await import('@/app/api/resubmit/route')
    const req = new Request('http://localhost/api/resubmit', {
      method: 'POST',
      body: JSON.stringify({ promotionId: 'promo-1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 404 when promotion not found or not owned', async () => {
    mockUserClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockUserClient.single.mockResolvedValue({ data: null, error: null })

    const { POST } = await import('@/app/api/resubmit/route')
    const req = new Request('http://localhost/api/resubmit', {
      method: 'POST',
      body: JSON.stringify({ promotionId: 'promo-1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('returns 422 when review_status is not revision_requested', async () => {
    mockUserClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockUserClient.single.mockResolvedValue({
      data: { id: 'promo-1', review_status: 'pending', payment_status: 'paid', advertiser_id: 'user-1' },
    })

    const { POST } = await import('@/app/api/resubmit/route')
    const req = new Request('http://localhost/api/resubmit', {
      method: 'POST',
      body: JSON.stringify({ promotionId: 'promo-1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })
})
