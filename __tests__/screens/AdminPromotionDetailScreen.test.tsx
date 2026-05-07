import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AdminPromotionDetailScreen from '@/app/(admin)/promotions/[id]';
import { promotionsService } from '@/services/promotions';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({ id: 'promo-1' })),
}));

jest.mock('@/lib/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'admin-1' },
  })),
}));

jest.mock('@/hooks/useAdminPromotions', () => ({
  useAdminPromotion: jest.fn(() => ({
    data: {
      id: 'promo-1',
      headline: 'Lobby Lunch Special',
      business_name: 'Cafe Unit',
      description: 'Lunch discount',
      start_date: '2026-05-01',
      end_date: '2026-05-07',
      review_status: 'pending',
      payment_status: 'paid',
      review_note: null,
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

jest.mock('@/services/promotions', () => ({
  promotionsService: {
    applyReviewAction: jest.fn(() => Promise.resolve()),
    toggleSuspend: jest.fn(() => Promise.resolve()),
    hasCompletedPaymentAttempt: jest.fn(() => Promise.resolve(true)),
  },
}));

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
    },
  },
}));

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 44, right: 0, bottom: 34, left: 0 },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AdminPromotionDetailScreen />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

describe('AdminPromotionDetailScreen', () => {
  it('surfaces review action success feedback in the screen tree', async () => {
    renderScreen();

    fireEvent.press(screen.getByText('Approve'));

    await waitFor(() => {
      expect(promotionsService.applyReviewAction).toHaveBeenCalledWith(
        'promo-1',
        'admin-1',
        expect.objectContaining({ headline: 'Lobby Lunch Special' }),
        { action: 'approve' }
      );
      expect(screen.getByTestId('review-action-feedback')).toHaveTextContent('Action applied');
    });
  });
});
