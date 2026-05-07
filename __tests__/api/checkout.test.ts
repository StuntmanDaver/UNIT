import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  stripeCheckoutCreate: vi.fn(),
  stripeCustomerCreate: vi.fn(),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      })
    ),
  },
}));

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(function Stripe() {
    return {
      checkout: {
        sessions: {
          create: mocks.stripeCheckoutCreate,
        },
      },
      customers: {
        create: mocks.stripeCustomerCreate,
      },
    };
  }),
}));

const authGetUser = vi.fn();
const promotionSingle = vi.fn();
const profileSingle = vi.fn();
const priceTierMaybeSingle = vi.fn();
const paymentAttemptInsert = vi.fn();
const profileUpdateEq = vi.fn();
const profileUpdate = vi.fn(() => ({ eq: profileUpdateEq }));

function createQuery(result: () => Promise<unknown>) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(result),
    maybeSingle: vi.fn(result),
  };
}

const userClient = {
  auth: {
    getUser: authGetUser,
  },
  from: vi.fn((table: string) => {
    if (table === 'promotions') return createQuery(promotionSingle);
    throw new Error(`Unexpected user table ${table}`);
  }),
};

const serviceClient = {
  from: vi.fn((table: string) => {
    if (table === 'advertiser_profiles') {
      return {
        ...createQuery(profileSingle),
        update: profileUpdate,
      };
    }
    if (table === 'promotion_price_tiers') return createQuery(priceTierMaybeSingle);
    if (table === 'promotion_payment_attempts') {
      return {
        insert: paymentAttemptInsert,
      };
    }
    throw new Error(`Unexpected service table ${table}`);
  }),
};

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue(userClient),
  createServiceRoleClient: vi.fn().mockReturnValue(serviceClient),
}));

describe('POST /api/checkout', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    authGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'owner@example.com' } } });
    promotionSingle.mockResolvedValue({
      data: {
        id: 'promo-1',
        advertiser_id: 'user-1',
        headline: 'Lunch special',
        review_status: 'draft',
        payment_status: 'unpaid',
      },
      error: null,
    });
    profileSingle.mockResolvedValue({
      data: {
        status: 'active',
        stripe_customer_id: 'cus_123',
        contact_email: 'billing@example.com',
      },
      error: null,
    });
    priceTierMaybeSingle.mockResolvedValue({
      data: {
        id: 'tier-1',
        name: 'Standard',
        duration_days: 30,
        is_featured: false,
        price_cents: 7500,
        currency: 'usd',
        is_active: true,
      },
      error: null,
    });
    mocks.stripeCheckoutCreate.mockResolvedValue({ id: 'cs_123', url: 'https://stripe.test/checkout' });
    mocks.stripeCustomerCreate.mockResolvedValue({ id: 'cus_new' });
    paymentAttemptInsert.mockResolvedValue({ error: null });
    profileUpdateEq.mockResolvedValue({ error: null });
  });

  it('returns 401 when unauthenticated', async () => {
    authGetUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import('@/app/api/checkout/route');
    const req = new Request('http://localhost/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ promotionId: 'promo-1', priceTierId: 'tier-1' }),
    });

    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it('returns 400 when the request body is invalid JSON', async () => {
    const { POST } = await import('@/app/api/checkout/route');
    const req = new Request('http://localhost/api/checkout', {
      method: 'POST',
      body: '{',
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it('returns 400 when priceTierId is missing', async () => {
    const { POST } = await import('@/app/api/checkout/route');
    const req = new Request('http://localhost/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ promotionId: 'promo-1', attemptType: 'repayment' }),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it('returns 404 when the promotion is missing or not owned by the advertiser', async () => {
    promotionSingle.mockResolvedValue({ data: null, error: null });

    const { POST } = await import('@/app/api/checkout/route');
    const req = new Request('http://localhost/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ promotionId: 'promo-1', priceTierId: 'tier-1' }),
    });

    const res = await POST(req);

    expect(res.status).toBe(404);
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it('returns 403 when the advertiser account is not active', async () => {
    profileSingle.mockResolvedValue({
      data: {
        status: 'pending',
        stripe_customer_id: 'cus_123',
        contact_email: 'billing@example.com',
      },
      error: null,
    });

    const { POST } = await import('@/app/api/checkout/route');
    const req = new Request('http://localhost/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ promotionId: 'promo-1', priceTierId: 'tier-1' }),
    });

    const res = await POST(req);

    expect(res.status).toBe(403);
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it('returns 409 when the promotion is already paid', async () => {
    promotionSingle.mockResolvedValue({
      data: {
        id: 'promo-1',
        advertiser_id: 'user-1',
        headline: 'Lunch special',
        review_status: 'pending',
        payment_status: 'paid',
      },
      error: null,
    });

    const { POST } = await import('@/app/api/checkout/route');
    const req = new Request('http://localhost/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ promotionId: 'promo-1', priceTierId: 'tier-1' }),
    });

    const res = await POST(req);

    expect(res.status).toBe(409);
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it('returns 422 when the promotion state is not eligible for checkout', async () => {
    promotionSingle.mockResolvedValue({
      data: {
        id: 'promo-1',
        advertiser_id: 'user-1',
        headline: 'Lunch special',
        review_status: 'approved',
        payment_status: 'unpaid',
      },
      error: null,
    });

    const { POST } = await import('@/app/api/checkout/route');
    const req = new Request('http://localhost/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ promotionId: 'promo-1', priceTierId: 'tier-1' }),
    });

    const res = await POST(req);

    expect(res.status).toBe(422);
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it('returns 404 when the selected price tier is inactive or missing', async () => {
    priceTierMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { POST } = await import('@/app/api/checkout/route');
    const req = new Request('http://localhost/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ promotionId: 'promo-1', priceTierId: 'tier-1' }),
    });

    const res = await POST(req);

    expect(res.status).toBe(404);
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it('derives attempt type and records selected tier pricing server-side', async () => {
    const { POST } = await import('@/app/api/checkout/route');
    const req = new Request('http://localhost/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        promotionId: 'promo-1',
        priceTierId: 'tier-1',
        attemptType: 'repayment',
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ url: 'https://stripe.test/checkout' });
    expect(mocks.stripeCheckoutCreate).toHaveBeenCalledWith(expect.objectContaining({
      line_items: [expect.objectContaining({
        price_data: expect.objectContaining({
          unit_amount: 7500,
          currency: 'usd',
        }),
      })],
    }));
    expect(paymentAttemptInsert).toHaveBeenCalledWith(expect.objectContaining({
      promotion_id: 'promo-1',
      price_tier_id: 'tier-1',
      amount_cents: 7500,
      attempt_type: 'initial',
    }));
  });

  it('derives repayment attempts from revision-requested repayment state', async () => {
    promotionSingle.mockResolvedValue({
      data: {
        id: 'promo-1',
        advertiser_id: 'user-1',
        headline: 'Lunch special',
        review_status: 'revision_requested',
        payment_status: 'repayment_required',
      },
      error: null,
    });

    const { POST } = await import('@/app/api/checkout/route');
    const req = new Request('http://localhost/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ promotionId: 'promo-1', priceTierId: 'tier-1' }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(paymentAttemptInsert).toHaveBeenCalledWith(expect.objectContaining({
      promotion_id: 'promo-1',
      price_tier_id: 'tier-1',
      amount_cents: 7500,
      attempt_type: 'repayment',
    }));
  });

  it('creates and stores a Stripe customer when the advertiser has none', async () => {
    profileSingle.mockResolvedValue({
      data: {
        status: 'active',
        stripe_customer_id: null,
        contact_email: 'billing@example.com',
      },
      error: null,
    });

    const { POST } = await import('@/app/api/checkout/route');
    const req = new Request('http://localhost/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ promotionId: 'promo-1', priceTierId: 'tier-1' }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mocks.stripeCustomerCreate).toHaveBeenCalledWith({ email: 'billing@example.com' });
    expect(profileUpdate).toHaveBeenCalledWith({ stripe_customer_id: 'cus_new' });
    expect(profileUpdateEq).toHaveBeenCalledWith('id', 'user-1');
  });
});
