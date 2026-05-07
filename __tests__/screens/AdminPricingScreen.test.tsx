import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AdminPricingScreen from '@/app/(admin)/pricing';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
  },
}));

jest.mock('@/hooks/usePromotionPricing', () => ({
  usePromotionPriceTiers: jest.fn(() => ({
    data: [
      {
        id: 'tier-standard',
        name: '7-day Standard',
        duration_days: 7,
        is_featured: false,
        price_cents: 2500,
        currency: 'usd',
        is_active: true,
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
      },
      {
        id: 'tier-featured',
        name: '30-day Featured',
        duration_days: 30,
        is_featured: true,
        price_cents: 9900,
        currency: 'usd',
        is_active: true,
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
      },
    ],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  })),
  useUpsertPriceTier: jest.fn(() => ({
    mutateAsync: jest.fn(),
  })),
  useDeactivatePriceTier: jest.fn(() => ({
    mutateAsync: jest.fn(),
  })),
}));

describe('AdminPricingScreen', () => {
  it('renders loaded tiers with individually targetable row actions', () => {
    render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 44, right: 0, bottom: 34, left: 0 },
        }}
      >
        <AdminPricingScreen />
      </SafeAreaProvider>
    );

    expect(screen.getByText('7-day Standard')).toBeTruthy();
    expect(screen.getByText('30-day Featured')).toBeTruthy();
    expect(screen.getByTestId('pricing-tier-card-7-day-standard')).toBeTruthy();
    expect(screen.getByTestId('pricing-tier-edit-7-day-standard')).toBeTruthy();
    expect(screen.getByTestId('pricing-tier-deactivate-7-day-standard')).toBeTruthy();
  });
});
