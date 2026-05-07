import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminProfilePanel } from '@/components/admin/AdminProfilePanel';
import { PricingAdminClient } from '@/components/admin/PricingAdminClient';
import { PropertiesAdminClient } from '@/components/admin/PropertiesAdminClient';
import { PushAdminClient } from '@/components/admin/PushAdminClient';
import type { AdminProfile, AdminProperty } from '@/lib/admin/types';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/push',
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function buildProperty(overrides: Partial<AdminProperty> = {}): AdminProperty {
  return {
    id: 'prop-1',
    name: 'Riverfront Plaza',
    address: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    type: 'commercial',
    total_units: 42,
    image_url: null,
    latitude: null,
    longitude: null,
    ...overrides,
  };
}

function buildProfile(overrides: Partial<AdminProfile> = {}): AdminProfile {
  return {
    id: 'admin-1',
    role: 'landlord',
    property_ids: ['prop-1'],
    email: 'admin@example.com',
    push_token: 'ExponentPushToken[abc]',
    needs_password_change: false,
    display_name: null,
    full_name: 'Avery Admin',
    invited_at: null,
    activated_at: '2026-05-07T00:00:00Z',
    status: 'active',
    created_at: '2026-05-07T00:00:00Z',
    ...overrides,
  };
}

describe('operations admin components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('renders assigned properties and submits the create-property form', async () => {
    const user = userEvent.setup();
    const onCreateProperty = vi.fn().mockResolvedValue('prop-new');

    render(<PropertiesAdminClient properties={[buildProperty()]} onCreateProperty={onCreateProperty} />);

    expect(screen.getByText('Riverfront Plaza')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^name$/i), 'Market Hall');
    await user.type(screen.getByLabelText(/address/i), '500 Market St');
    await user.type(screen.getByLabelText(/city/i), 'Oakland');
    await user.type(screen.getByLabelText(/state/i), 'CA');
    await user.clear(screen.getByLabelText(/total units/i));
    await user.type(screen.getByLabelText(/total units/i), '24');
    await user.click(screen.getByRole('button', { name: /create property/i }));

    await waitFor(() => {
      expect(onCreateProperty).toHaveBeenCalledWith({
        name: 'Market Hall',
        address: '500 Market St',
        city: 'Oakland',
        state: 'CA',
        type: 'commercial',
        totalUnits: 24,
      });
    });
  });

  it('submits pricing tiers as cents with featured and active toggles', async () => {
    const user = userEvent.setup();
    const onUpsertTier = vi.fn().mockResolvedValue(undefined);

    render(<PricingAdminClient tiers={[]} onUpsertTier={onUpsertTier} onDeactivateTier={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /add tier/i }));
    await user.type(screen.getByLabelText(/^name$/i), 'Launch Week');
    await user.clear(screen.getByLabelText(/duration days/i));
    await user.type(screen.getByLabelText(/duration days/i), '7');
    await user.clear(screen.getByLabelText(/price cents/i));
    await user.type(screen.getByLabelText(/price cents/i), '4995');
    await user.click(screen.getByLabelText(/featured/i));
    await user.click(screen.getByRole('button', { name: /save tier/i }));

    await waitFor(() => {
      expect(onUpsertTier).toHaveBeenCalledWith({
        name: 'Launch Week',
        durationDays: 7,
        priceCents: 4995,
        isFeatured: true,
        isActive: true,
      });
    });
  });

  it('updates the push property query string, enforces field caps, and confirms before sending', async () => {
    const user = userEvent.setup();
    const onSendBroadcast = vi.fn().mockResolvedValue({ sent: 3, failed: 0, total: 3 });

    render(
      <PushAdminClient
        properties={[buildProperty(), buildProperty({ id: 'prop-2', name: 'Market Hall' })]}
        selectedPropertyId=""
        notifications={[]}
        onSendBroadcast={onSendBroadcast}
      />
    );

    const titleInput = screen.getByLabelText(/title/i);
    const messageInput = screen.getByLabelText(/message/i);

    await user.selectOptions(screen.getByLabelText(/property/i), 'prop-2');
    await user.type(titleInput, 'L'.repeat(60));
    await user.type(messageInput, 'Main lobby doors reopen at noon.');
    await user.selectOptions(screen.getByLabelText(/audience/i), 'active');
    expect((titleInput as HTMLInputElement).value).toHaveLength(50);

    await user.click(screen.getByRole('button', { name: /send broadcast/i }));

    expect(push).toHaveBeenCalledWith('/admin/push?propertyId=prop-2');
    expect(window.confirm).toHaveBeenCalledWith('Send this broadcast to active tenants?');

    await waitFor(() => {
      expect(onSendBroadcast).toHaveBeenCalledWith({
        propertyId: 'prop-2',
        title: 'L'.repeat(50),
        message: 'Main lobby doors reopen at noon.',
        audience: 'active',
      });
    });
  });

  it('renders admin profile details, property count, push state, and logout area', () => {
    render(
      <AdminProfilePanel
        profile={buildProfile()}
        properties={[buildProperty()]}
        pushPermissionGranted
        logoutAction={vi.fn()}
      />
    );

    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('landlord')).toBeInTheDocument();
    expect(screen.getByText('1 total')).toBeInTheDocument();
    expect(screen.getByText('Riverfront Plaza')).toBeInTheDocument();
    expect(screen.getByText('ExponentPushToken[abc]')).toBeInTheDocument();
    expect(screen.getByText('Granted')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });
});
