import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock useAuth -- AuthContext is not exported, so mock the hook directly
// This mock MUST be before the LandlordGuard import (vi.mock is hoisted)
vi.mock('@/lib/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock supabaseClient to prevent import errors in any transitive dependency
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      }),
    },
    from: vi.fn(),
  }
}));

import LandlordGuard from '@/components/guards/LandlordGuard';
import { useAuth } from '@/lib/AuthContext';

function renderWithRouter(authValue) {
  useAuth.mockReturnValue(authValue);
  return render(
    <MemoryRouter initialEntries={['/LandlordDashboard']}>
      <Routes>
        <Route element={<LandlordGuard />}>
          <Route path="/LandlordDashboard" element={<div>Protected Content</div>} />
        </Route>
        <Route path="/LandlordLogin" element={<div>Login Page</div>} />
        <Route path="/Welcome" element={<div>Welcome Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('LandlordGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner when auth is loading', () => {
    renderWithRouter({ user: null, isLoadingAuth: true, isLandlord: false });
    // Loader2 renders as an SVG -- the container div has the spinner
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Welcome Page')).not.toBeInTheDocument();
  });

  it('redirects to /LandlordLogin when user is null', () => {
    renderWithRouter({ user: null, isLoadingAuth: false, isLandlord: false });
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to /Welcome when user is not a landlord', () => {
    renderWithRouter({ user: { id: 'user-1', email: 'tenant@test.com' }, isLoadingAuth: false, isLandlord: false });
    expect(screen.getByText('Welcome Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders child route when user is an authenticated landlord', () => {
    renderWithRouter({ user: { id: 'user-1', email: 'landlord@test.com' }, isLoadingAuth: false, isLandlord: true });
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Welcome Page')).not.toBeInTheDocument();
  });
});
