import { getActivityFeed } from '@/services/activityFeed';

// Per-table canned data the mock chain resolves with. Tests mutate this
// before invoking the service.
const tableData: Record<string, unknown[]> = {};

const mockFrom = jest.fn((table: string) => {
  const chain: Record<string, unknown> = {
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    // Awaiting the chain triggers .then() — resolve with that table's rows.
    then: (resolve: (v: unknown) => void) =>
      resolve({ data: tableData[table] ?? [], error: null }),
  };
  return chain;
});

const mockGetUser = jest
  .fn()
  .mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    auth: {
      getUser: () => mockGetUser(),
    },
  },
}));

beforeEach(() => {
  for (const key of Object.keys(tableData)) delete tableData[key];
  mockFrom.mockClear();
  mockGetUser.mockClear();
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null,
  });
});

describe('getActivityFeed', () => {
  it('returns [] when propertyIds is empty (no DB calls)', async () => {
    const result = await getActivityFeed([]);
    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('fetches each underlying source exactly once (no N+1)', async () => {
    await getActivityFeed(['p1', 'p2']);
    const tablesCalled = mockFrom.mock.calls.map((c) => c[0]);
    for (const table of [
      'promotions',
      'posts',
      'businesses',
      'notifications',
    ]) {
      const matches = tablesCalled.filter((t) => t === table);
      expect(matches).toHaveLength(1);
    }
  });

  it('skips notifications fetch when no user is signed in', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });
    await getActivityFeed(['p1']);
    const tablesCalled = mockFrom.mock.calls.map((c) => c[0]);
    expect(tablesCalled).not.toContain('notifications');
    expect(tablesCalled).toEqual(
      expect.arrayContaining(['promotions', 'posts', 'businesses'])
    );
  });

  it('merges all sources and sorts by occurredAt DESC', async () => {
    tableData.promotions = [
      {
        id: 'pr1',
        property_id: 'p1',
        headline: 'Spring sale',
        description: '20% off',
        business_name: 'Acme',
        image_url: null,
        created_at: '2026-05-02T10:00:00Z',
      },
    ];
    tableData.posts = [
      {
        id: 'po1',
        property_id: 'p1',
        type: 'event',
        title: 'Mixer',
        content: 'Tonight at 6',
        image_url: null,
        created_date: '2026-05-03T09:00:00Z',
      },
      {
        id: 'po2',
        property_id: 'p1',
        type: 'announcement',
        title: 'WiFi outage',
        content: '7-9pm',
        image_url: null,
        created_date: '2026-05-01T08:00:00Z',
      },
    ];
    tableData.businesses = [
      {
        id: 'b1',
        property_id: 'p1',
        business_name: 'NewCo',
        business_description: 'Great food',
        category: 'Food',
        logo_url: null,
        created_at: '2026-05-03T10:00:00Z',
      },
    ];
    tableData.notifications = [];

    const items = await getActivityFeed(['p1']);
    expect(items.map((i) => i.id)).toEqual(['b1', 'po1', 'pr1', 'po2']);
    expect(items.map((i) => i.kind)).toEqual([
      'tenant_signup',
      'post',
      'promotion',
      'announcement',
    ]);
  });

  it('respects the limit parameter after merge+sort', async () => {
    tableData.posts = Array.from({ length: 10 }, (_, i) => ({
      id: `po${i}`,
      property_id: 'p1',
      type: 'event',
      title: `Post ${i}`,
      content: '',
      image_url: null,
      // Newer ids should sort first; pad day so DESC ISO compare works.
      created_date: `2026-05-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }));
    const items = await getActivityFeed(['p1'], 3);
    expect(items).toHaveLength(3);
    expect(items.map((i) => i.id)).toEqual(['po9', 'po8', 'po7']);
  });

  it('maps post type=announcement → kind=announcement, others → kind=post', async () => {
    tableData.posts = [
      {
        id: 'a1',
        property_id: 'p1',
        type: 'announcement',
        title: 'A',
        content: '',
        image_url: null,
        created_date: '2026-05-01T00:00:00Z',
      },
      {
        id: 'e1',
        property_id: 'p1',
        type: 'event',
        title: 'E',
        content: '',
        image_url: null,
        created_date: '2026-05-02T00:00:00Z',
      },
      {
        id: 'o1',
        property_id: 'p1',
        type: 'offer',
        title: 'O',
        content: '',
        image_url: null,
        created_date: '2026-05-03T00:00:00Z',
      },
    ];
    const items = await getActivityFeed(['p1']);
    const byId = Object.fromEntries(items.map((i) => [i.id, i]));
    expect(byId['a1'].kind).toBe('announcement');
    expect(byId['a1'].ctaRoute).toBeUndefined();
    expect(byId['e1'].kind).toBe('post');
    expect(byId['e1'].ctaRoute).toBe('/(tabs)/community');
    expect(byId['o1'].kind).toBe('post');
  });
});
