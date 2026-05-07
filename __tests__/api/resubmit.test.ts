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

  it('returns 422 when repayment is required instead of free resubmit', async () => {
    mockUserClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockUserClient.single.mockResolvedValue({
      data: { id: 'promo-1', review_status: 'revision_requested', payment_status: 'repayment_required', advertiser_id: 'user-1' },
    })

    const { POST } = await import('@/app/api/resubmit/route')
    const req = new Request('http://localhost/api/resubmit', {
      method: 'POST',
      body: JSON.stringify({ promotionId: 'promo-1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('updates revision-requested paid promotions back to pending and records an event', async () => {
    mockUserClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockUserClient.single.mockResolvedValue({
      data: { id: 'promo-1', review_status: 'revision_requested', payment_status: 'paid', advertiser_id: 'user-1' },
    })

    const { POST } = await import('@/app/api/resubmit/route')
    const req = new Request('http://localhost/api/resubmit', {
      method: 'POST',
      body: JSON.stringify({ promotionId: 'promo-1' }),
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockServiceClient.from).toHaveBeenCalledWith('promotions')
    expect(mockServiceClient.update).toHaveBeenCalledWith({ review_status: 'pending' })
    expect(mockServiceClient.from).toHaveBeenCalledWith('promotion_status_events')
    expect(mockServiceClient.insert).toHaveBeenCalledWith(expect.objectContaining({
      promotion_id: 'promo-1',
      from_review_status: 'revision_requested',
      to_review_status: 'pending',
      from_payment_status: 'paid',
      to_payment_status: 'paid',
      actor_user_id: 'user-1',
      actor_type: 'advertiser',
    }))
  })
})
