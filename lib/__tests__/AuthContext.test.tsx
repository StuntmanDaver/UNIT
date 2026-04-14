/**
 * Unit tests for AuthContext covering:
 * - BUG-01: AuthContext double-init race (INITIAL_SESSION must be skipped during init,
 *   but TOKEN_REFRESHED / SIGNED_IN / SIGNED_OUT must still be processed).
 * - BUG-13: Profile fetch failure during init must NOT leave user as
 *   "authenticated with null profile" — signOut + clear state + isLoading=false.
 *
 * The supabase module is manually mocked so tests can drive getSession() and fire
 * onAuthStateChange callbacks at will.
 */

import React from 'react';
import { Text, View } from 'react-native';
import { render, waitFor, act } from '@testing-library/react-native';

// ----- mock state (must use `mock` prefix for jest hoisting) -----

type AuthStateChangeCallback = (
  event: string,
  session: { user: { id: string; email: string } } | null
) => Promise<void> | void;

const mockState = {
  authCallbacks: [] as AuthStateChangeCallback[],
  profileFetchCount: 0,
  profileFetchBehavior: 'resolve' as 'resolve' | 'reject',
  signOutCount: 0,
  getSession: jest.fn() as jest.Mock,
};

const mockProfileRow = {
  id: 'user-1',
  role: 'tenant' as const,
  property_ids: ['prop-1'],
  email: 'user1@test.com',
  needs_password_change: false,
  status: 'active' as const,
};

const mockBusinessRow = { id: 'biz-1' };

jest.mock('@/services/supabase', () => {
  const from = (table: string) => {
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.eq = () => chain;
    chain.limit = () => Promise.resolve({ data: [mockBusinessRow], error: null });
    chain.single = () => {
      if (table === 'profiles') {
        mockState.profileFetchCount += 1;
        if (mockState.profileFetchBehavior === 'reject') {
          return Promise.resolve({
            data: null,
            error: { message: 'profile fetch failed' },
          });
        }
        return Promise.resolve({ data: mockProfileRow, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    };
    return chain;
  };

  return {
    supabase: {
      from,
      auth: {
        getSession: (...args: unknown[]) => mockState.getSession(...args),
        signOut: async () => {
          mockState.signOutCount += 1;
          return { error: null };
        },
        onAuthStateChange: (cb: AuthStateChangeCallback) => {
          mockState.authCallbacks.push(cb);
          return {
            data: {
              subscription: {
                unsubscribe: () => {
                  const idx = mockState.authCallbacks.indexOf(cb);
                  if (idx >= 0) mockState.authCallbacks.splice(idx, 1);
                },
              },
            },
          };
        },
      },
    },
  };
});

// Import AFTER mock is registered.
import { AuthProvider, useAuth } from '@/lib/AuthContext';

function TestConsumer() {
  const { isLoading, isAuthenticated, profile, needsPasswordChange } = useAuth();
  return (
    <View>
      <Text testID="isLoading">{isLoading ? 'true' : 'false'}</Text>
      <Text testID="isAuthenticated">{isAuthenticated ? 'true' : 'false'}</Text>
      <Text testID="profile">{profile ? profile.id : 'null'}</Text>
      <Text testID="needsPasswordChange">{needsPasswordChange ? 'true' : 'false'}</Text>
    </View>
  );
}

async function fireAuthEvent(
  event: string,
  session: { user: { id: string; email: string } } | null
) {
  const callbacks = [...mockState.authCallbacks];
  for (const cb of callbacks) {
    await act(async () => {
      await cb(event, session);
    });
  }
}

beforeEach(() => {
  mockState.authCallbacks.length = 0;
  mockState.profileFetchCount = 0;
  mockState.signOutCount = 0;
  mockState.profileFetchBehavior = 'resolve';
  mockState.getSession.mockReset();
});

describe('AuthContext — BUG-01 double-init race', () => {
  it('Test 1: on cold start with a session, initAuth fetches the profile exactly once even if INITIAL_SESSION fires', async () => {
    mockState.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1', email: 'user1@test.com' } } },
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Simulate supabase-js firing INITIAL_SESSION synchronously after subscribe.
    await fireAuthEvent('INITIAL_SESSION', { user: { id: 'user-1', email: 'user1@test.com' } });

    await waitFor(() => expect(getByTestId('isLoading').props.children).toBe('false'));

    // EXACTLY one profile fetch — the one from initAuth. INITIAL_SESSION must be skipped.
    expect(mockState.profileFetchCount).toBe(1);
    expect(getByTestId('profile').props.children).toBe('user-1');
    expect(getByTestId('isAuthenticated').props.children).toBe('true');
  });

  it('Test 2: after init, TOKEN_REFRESHED still triggers a profile refetch (BUG-01 fix must not over-block)', async () => {
    mockState.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1', email: 'user1@test.com' } } },
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(getByTestId('isLoading').props.children).toBe('false'));
    expect(mockState.profileFetchCount).toBe(1);

    await fireAuthEvent('TOKEN_REFRESHED', { user: { id: 'user-1', email: 'user1@test.com' } });

    expect(mockState.profileFetchCount).toBe(2);
  });

  it('Test 3: after init, SIGNED_IN still triggers a profile refetch + setUser', async () => {
    mockState.getSession.mockResolvedValue({ data: { session: null } });

    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(getByTestId('isLoading').props.children).toBe('false'));
    expect(getByTestId('isAuthenticated').props.children).toBe('false');
    expect(mockState.profileFetchCount).toBe(0);

    await fireAuthEvent('SIGNED_IN', { user: { id: 'user-1', email: 'user1@test.com' } });

    expect(mockState.profileFetchCount).toBe(1);
    expect(getByTestId('isAuthenticated').props.children).toBe('true');
    expect(getByTestId('profile').props.children).toBe('user-1');
  });

  it('Test 4: after init, SIGNED_OUT clears user/profile and leaves isLoading=false', async () => {
    mockState.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1', email: 'user1@test.com' } } },
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(getByTestId('isLoading').props.children).toBe('false'));
    expect(getByTestId('isAuthenticated').props.children).toBe('true');

    await fireAuthEvent('SIGNED_OUT', null);

    expect(getByTestId('isAuthenticated').props.children).toBe('false');
    expect(getByTestId('profile').props.children).toBe('null');
    expect(getByTestId('isLoading').props.children).toBe('false');
  });
});

describe('AuthContext — BUG-13 isLoading on profile-fetch failure', () => {
  it('Test 5: if fetchProfile throws during initAuth, user is signed out and not left as authenticated-with-null-profile', async () => {
    mockState.profileFetchBehavior = 'reject';
    mockState.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1', email: 'user1@test.com' } } },
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(getByTestId('isLoading').props.children).toBe('false'));

    // The rendered state must NOT be "authenticated with profile=null".
    // After init failure the user should be signed out.
    expect(getByTestId('isAuthenticated').props.children).toBe('false');
    expect(getByTestId('profile').props.children).toBe('null');
    expect(mockState.signOutCount).toBe(1);
  });
});

describe('AuthContext — no-regression cold start with no session', () => {
  it('Test 6: on cold start with no session, state settles to unauthenticated and subsequent events still process', async () => {
    mockState.getSession.mockResolvedValue({ data: { session: null } });

    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(getByTestId('isLoading').props.children).toBe('false'));
    expect(getByTestId('isAuthenticated').props.children).toBe('false');
    expect(getByTestId('profile').props.children).toBe('null');
    expect(mockState.profileFetchCount).toBe(0);

    // INITIAL_SESSION fires with null session — must be skipped (init is source of truth).
    await fireAuthEvent('INITIAL_SESSION', null);
    expect(mockState.profileFetchCount).toBe(0);

    // Then a real SIGNED_IN comes in — must process normally.
    await fireAuthEvent('SIGNED_IN', { user: { id: 'user-1', email: 'user1@test.com' } });
    expect(mockState.profileFetchCount).toBe(1);
    expect(getByTestId('isAuthenticated').props.children).toBe('true');
  });
});
