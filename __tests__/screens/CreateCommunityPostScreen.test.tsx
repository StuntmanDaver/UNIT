import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CreateCommunityPostScreen from '@/app/(tabs)/community/create';
import { postsService } from '@/services/posts';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    dismissAll: jest.fn(),
    dismissTo: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('@/lib/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    propertyIds: ['property-1'],
    user: { email: 'tenant1@unit-test.com' },
  })),
}));

jest.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: jest.fn(() => ({
    data: {
      id: 'business-1',
      business_name: 'QA Tenant Business',
    },
  })),
}));

jest.mock('@/services/posts', () => ({
  postsService: {
    create: jest.fn(() => Promise.resolve({ id: 'post-1' })),
  },
}));

jest.mock('@/services/storage', () => ({
  storageService: {
    uploadFile: jest.fn(),
  },
}));

jest.mock('@/services/admin', () => ({
  adminService: {
    sendPush: jest.fn(() => Promise.resolve()),
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
        <CreateCommunityPostScreen />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

describe('CreateCommunityPostScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns to the community tab after publishing an event', async () => {
    renderScreen();

    fireEvent.press(screen.getByText('event'));
    fireEvent.changeText(screen.getByTestId('post-title'), 'QA Event Post');
    fireEvent.changeText(screen.getByTestId('post-content'), 'Automated event content.');
    fireEvent.changeText(screen.getByTestId('post-event-date'), '2026-12-31');
    fireEvent.press(screen.getByTestId('btn-post-submit'));

    await waitFor(() => {
      expect(postsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          property_id: 'property-1',
          business_id: 'business-1',
          type: 'event',
          title: 'QA Event Post',
          event_date: '2026-12-31',
        })
      );
    });

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(tabs)/community');
    });
    expect(router.back).not.toHaveBeenCalled();
    expect(router.dismissAll).not.toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
