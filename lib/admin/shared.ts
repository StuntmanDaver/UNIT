import { createServiceRoleClient } from '@/lib/supabase/server';
import type { AdminProperty } from './types';

type SupabaseError = { message: string };

export function throwIfError(error: SupabaseError | null | undefined): void {
  if (error) throw new Error(error.message);
}

export function selectedPropertyId(propertyIds: string[], requested?: string | null): string {
  if (requested && propertyIds.includes(requested)) return requested;
  return propertyIds[0] ?? '';
}

export function normalizeHttpUrl(value: string, fieldName: string): string {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error(`${fieldName} must start with http:// or https://`);
    }
    return url.toString();
  } catch {
    throw new Error(`${fieldName} must be a valid http:// or https:// URL`);
  }
}

export async function getAssignedProperties(propertyIds: string[]): Promise<AdminProperty[]> {
  if (propertyIds.length === 0) return [];
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .in('id', propertyIds)
    .order('name', { ascending: true });
  throwIfError(error);
  return (data ?? []) as AdminProperty[];
}
