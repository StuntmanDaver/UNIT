import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canAccessProperty, normalizePropertyIds } from './permissions';
import type { AdminProfile } from './types';

export type AdminContext = {
  user: User;
  profile: AdminProfile;
  propertyIds: string[];
  accessToken: string | null;
};

export class AdminAuthError extends Error {
  constructor(message: string, public readonly status: 401 | 403 = 403) {
    super(message);
    this.name = 'AdminAuthError';
  }
}

async function loadAdminContext(): Promise<AdminContext | null> {
  const auth = await createServerSupabaseClient();
  const [
    { data: { user } },
    { data: { session } },
  ] = await Promise.all([
    auth.auth.getUser(),
    auth.auth.getSession(),
  ]);

  if (!user) return null;

  const service = createServiceRoleClient();
  const { data: profile } = await service
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'landlord') return null;

  const adminProfile = {
    ...profile,
    property_ids: normalizePropertyIds(profile.property_ids),
  } as AdminProfile;

  return {
    user,
    profile: adminProfile,
    propertyIds: adminProfile.property_ids,
    accessToken: session?.access_token ?? null,
  };
}

export async function requireAdmin(): Promise<AdminContext> {
  const context = await loadAdminContext();
  if (!context) {
    const auth = await createServerSupabaseClient();
    const { data: { user } } = await auth.auth.getUser();
    redirect(user ? '/dashboard' : '/login');
  }
  return context;
}

export async function requireAdminAction(): Promise<AdminContext> {
  const context = await loadAdminContext();
  if (!context) {
    const auth = await createServerSupabaseClient();
    const { data: { user } } = await auth.auth.getUser();
    throw new AdminAuthError(user ? 'Admin access required' : 'Authentication required', user ? 403 : 401);
  }
  return context;
}

export function assertAdminPropertyAccess(context: AdminContext, propertyId: string): void {
  if (!canAccessProperty(context.profile, propertyId)) {
    throw new AdminAuthError('You do not have access to this property', 403);
  }
}
