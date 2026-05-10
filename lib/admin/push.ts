'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { assertAdminPropertyAccess, requireAdminAction } from './auth';
import { getAssignedProperties, selectedPropertyId, throwIfError } from './shared';
import type { AdminNotification, AdminProperty } from './types';

type PushBroadcastInput = {
  propertyId: string;
  title: string;
  message: string;
  audience: 'all' | 'active';
};

export async function sendPushBroadcastAction(input: PushBroadcastInput): Promise<{ sent: number; failed: number; total: number }> {
  const context = await requireAdminAction();
  assertAdminPropertyAccess(context, input.propertyId);
  if (input.title.trim().length === 0 || input.title.length > 50) throw new Error('Title must be 1-50 characters');
  if (input.message.trim().length === 0 || input.message.length > 200) throw new Error('Message must be 1-200 characters');

  const auth = await createServerSupabaseClient();
  const { data, error } = await auth.functions.invoke('send-push-notification', {
    body: {
      property_id: input.propertyId,
      title: input.title.trim(),
      message: input.message.trim(),
      audience: input.audience,
      data: { type: 'broadcast' },
    },
  });
  throwIfError(error);
  revalidatePath('/admin/push');
  return data as { sent: number; failed: number; total: number };
}

export async function getBroadcastHistory(propertyId?: string | null): Promise<{
  properties: AdminProperty[];
  selectedPropertyId: string;
  notifications: AdminNotification[];
}> {
  const context = await requireAdminAction();
  const properties = await getAssignedProperties(context.propertyIds);
  const selected = selectedPropertyId(context.propertyIds, propertyId);
  if (!selected) return { properties, selectedPropertyId: '', notifications: [] };
  assertAdminPropertyAccess(context, selected);
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('property_id', selected)
    .eq('type', 'broadcast')
    .order('created_date', { ascending: false })
    .limit(20);
  throwIfError(error);
  return {
    properties,
    selectedPropertyId: selected,
    notifications: (data ?? []) as AdminNotification[],
  };
}
