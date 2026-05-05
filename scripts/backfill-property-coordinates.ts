// One-shot backfill for property latitude/longitude.
//
// The 20260501000002_property_clusters.sql migration added nullable lat/lon
// columns; existing rows are NULL. New properties created via the admin UI
// after US-003 are geocoded inline, but we still need a one-time pass for
// the existing rows. This script is idempotent — it only touches rows where
// (latitude IS NULL OR longitude IS NULL), so it's safe to re-run after a
// new batch of properties is imported via SQL seed.
//
// Run from the unit/ directory:
//   tsx scripts/backfill-property-coordinates.ts
//
// Required env (read from process.env, typically via .env.local):
//   EXPO_PUBLIC_SUPABASE_URL  — project URL
//   SUPABASE_SERVICE_ROLE_KEY — service-role key (bypasses RLS)
//
// We deliberately use the service-role key here instead of the anon key
// because RLS on properties allows only landlord-admins to UPDATE — running
// the backfill as a privileged operator avoids needing to log in as each
// property's admin.

import { createClient } from '@supabase/supabase-js';
import { geocodeAddress } from '../services/geocoding';

type PropertyRow = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
};

async function main(): Promise<void> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      'Missing env. Required: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY'
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows, error } = await supabase
    .from('properties')
    .select('id, name, address, city, state, latitude, longitude')
    .or('latitude.is.null,longitude.is.null');

  if (error) {
    console.error('Failed to load properties:', error.message);
    process.exit(1);
  }

  const properties = (rows ?? []) as PropertyRow[];
  console.log(`Found ${properties.length} property row(s) needing coordinates.`);

  let succeeded = 0;
  let failed = 0;

  for (const property of properties) {
    const fullAddress = `${property.address}, ${property.city}, ${property.state}`;
    console.log(`-> [${property.id}] ${property.name} :: ${fullAddress}`);

    const coords = await geocodeAddress(fullAddress);
    if (!coords) {
      console.warn(`   no result; leaving NULL`);
      failed += 1;
      continue;
    }

    const { error: updateError } = await supabase
      .from('properties')
      .update({ latitude: coords.lat, longitude: coords.lon })
      .eq('id', property.id);

    if (updateError) {
      console.error(`   update failed: ${updateError.message}`);
      failed += 1;
      continue;
    }

    console.log(`   ok lat=${coords.lat} lon=${coords.lon}`);
    succeeded += 1;
  }

  console.log(`\nDone. succeeded=${succeeded} failed=${failed} total=${properties.length}`);
  if (failed > 0) {
    console.log('Re-run after fixing failing addresses; this script is idempotent.');
  }
}

main().catch((err) => {
  console.error('Backfill script crashed:', err);
  process.exit(1);
});
