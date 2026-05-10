'use server';

import { revalidatePath } from 'next/cache';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdminAction } from './auth';
import { getAssignedProperties, throwIfError } from './shared';
import type { AdminProperty } from './types';

type PropertyInput = {
  name: string;
  address: string;
  city: string;
  state: string;
  type?: string;
  totalUnits?: number;
};

export async function getAdminProperties(): Promise<AdminProperty[]> {
  const context = await requireAdminAction();
  return getAssignedProperties(context.propertyIds);
}

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=1`,
      { headers: { Accept: 'application/json', 'User-Agent': 'UNIT-portal/1.0' } }
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as Array<{ lat: string; lon: string }>;
    const lat = Number(payload[0]?.lat);
    const lon = Number(payload[0]?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch {
    return null;
  }
}

export async function createPropertyAction(input: PropertyInput): Promise<string> {
  const context = await requireAdminAction();
  const units = Number(input.totalUnits ?? 0);
  if (!input.name.trim() || !input.address.trim() || !input.city.trim() || !input.state.trim()) {
    throw new Error('Name, address, city, and state are required');
  }
  if (!Number.isFinite(units) || units < 0) throw new Error('Total units must be a non-negative number');

  const fullAddress = `${input.address.trim()}, ${input.city.trim()}, ${input.state.trim()}`;
  const coords = await geocodeAddress(fullAddress);
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('properties')
    .insert({
      name: input.name.trim(),
      address: input.address.trim(),
      city: input.city.trim(),
      state: input.state.trim().toUpperCase(),
      type: input.type?.trim() || 'commercial',
      total_units: units,
      image_url: null,
      latitude: coords?.lat ?? null,
      longitude: coords?.lon ?? null,
    })
    .select('id')
    .single();
  throwIfError(error);
  if (!data) throw new Error('Property creation did not return an id');

  const nextPropertyIds = Array.from(new Set([...context.propertyIds, data.id as string]));
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ property_ids: nextPropertyIds })
    .eq('id', context.user.id);
  throwIfError(updateError);
  revalidatePath('/admin/properties');
  revalidatePath('/admin');
  return data.id as string;
}
