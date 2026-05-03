import {
  getNearbyPropertyIds,
  haversineMiles,
} from '@/services/nearbyProperties';

// ─── chainable supabase mock ────────────────────────────────────────────────
const mockChain = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  // The list query has no .single() — its result resolves directly off select().
  // Allow the awaited chain by exposing then() in setListResult below.
};

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockChain),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockChain.select.mockReturnThis();
  mockChain.eq.mockReturnThis();
  mockChain.single.mockResolvedValue({ data: null, error: null });
});

// ─── haversineMiles ─────────────────────────────────────────────────────────

describe('haversineMiles', () => {
  it('returns 0 for identical coordinates', () => {
    const point = { lat: 29.2108, lon: -81.0228 };
    expect(haversineMiles(point, point)).toBeCloseTo(0, 5);
  });

  it('Daytona cluster: two points ~0.6 mi apart are within a 2 mi radius', () => {
    // Downtown Daytona Beach vs ~0.92 km north along the same longitude.
    const downtown = { lat: 29.2108, lon: -81.0228 };
    const justNorth = { lat: 29.2208, lon: -81.0228 };
    const distance = haversineMiles(downtown, justNorth);
    expect(distance).toBeGreaterThan(0.5);
    expect(distance).toBeLessThan(0.8);
    expect(distance).toBeLessThanOrEqual(2);
  });

  it('one degree of latitude is ~69 miles (well outside a 2 mi radius)', () => {
    const a = { lat: 29.0, lon: -81.0 };
    const b = { lat: 30.0, lon: -81.0 };
    const distance = haversineMiles(a, b);
    expect(distance).toBeGreaterThan(68);
    expect(distance).toBeLessThan(70);
  });

  it('NYC → LA is ~2,450 miles', () => {
    const nyc = { lat: 40.7128, lon: -74.006 };
    const la = { lat: 34.0522, lon: -118.2437 };
    const distance = haversineMiles(nyc, la);
    expect(distance).toBeGreaterThan(2440);
    expect(distance).toBeLessThan(2460);
  });
});

// ─── getNearbyPropertyIds ───────────────────────────────────────────────────

describe('getNearbyPropertyIds', () => {
  it('returns [origin, ...nearbyIds] sorted by distance, excluding rows outside radius', async () => {
    const origin = { id: 'orig', latitude: 29.2108, longitude: -81.0228 };
    const near = { id: 'near', latitude: 29.2208, longitude: -81.0228 }; // ~0.69 mi
    const veryNear = { id: 'very-near', latitude: 29.2128, longitude: -81.0228 }; // ~0.14 mi
    const far = { id: 'far', latitude: 30.0, longitude: -81.0228 }; // ~55 mi

    mockChain.single.mockResolvedValueOnce({ data: origin, error: null });
    // Second call (.select without .eq().single()) should resolve via the
    // awaited promise on the chain — we override .select to return a
    // thenable for the list query.
    mockChain.select.mockImplementationOnce(() => mockChain) // 1st call: chain to .eq() for origin
      .mockImplementationOnce(() =>
        Promise.resolve({ data: [origin, near, veryNear, far], error: null })
      );

    const result = await getNearbyPropertyIds('orig', 2);
    expect(result[0]).toBe('orig');
    expect(result.slice(1)).toEqual(['very-near', 'near']);
    expect(result).not.toContain('far');
  });

  it('returns only the origin when origin has null coordinates', async () => {
    const origin = { id: 'orig', latitude: null, longitude: null };
    mockChain.single.mockResolvedValueOnce({ data: origin, error: null });

    const result = await getNearbyPropertyIds('orig', 2);
    expect(result).toEqual(['orig']);
  });

  it('skips rows with null coordinates when computing neighbours', async () => {
    const origin = { id: 'orig', latitude: 29.2108, longitude: -81.0228 };
    const near = { id: 'near', latitude: 29.2128, longitude: -81.0228 };
    const noCoords = { id: 'nc', latitude: null, longitude: null };

    mockChain.single.mockResolvedValueOnce({ data: origin, error: null });
    mockChain.select
      .mockImplementationOnce(() => mockChain)
      .mockImplementationOnce(() =>
        Promise.resolve({ data: [origin, near, noCoords], error: null })
      );

    const result = await getNearbyPropertyIds('orig', 2);
    expect(result).toEqual(['orig', 'near']);
  });
});
