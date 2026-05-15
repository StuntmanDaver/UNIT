#!/usr/bin/env node
/**
 * Cleanup script for E2E test users created in production Supabase.
 *
 * The m1-05-onboarding.yaml Maestro flow creates real auth users with the
 * pattern `e2e-{timestamp}@mailinator.com`. Without cleanup, every test run
 * accumulates an unused account in production. Run this script periodically
 * (e.g. weekly via cron) to delete those accounts and their associated rows.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... EXPO_PUBLIC_SUPABASE_URL=... \
 *     node scripts/cleanup-e2e-test-users.mjs [--dry-run]
 *
 * Set ALLOW_PRODUCTION_CLEANUP=1 to actually delete (safety guard).
 * Use --dry-run to preview which users would be deleted.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes('--dry-run');
const allowed = process.env.ALLOW_PRODUCTION_CLEANUP === '1';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!allowed && !dryRun) {
  console.error('Refusing to delete without ALLOW_PRODUCTION_CLEANUP=1 (or pass --dry-run).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAIL_PATTERN = /^e2e-\d+@mailinator\.com$/i;

async function listE2eUsers() {
  const matches = [];
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    if (!data?.users || data.users.length === 0) break;
    for (const user of data.users) {
      if (user.email && EMAIL_PATTERN.test(user.email)) {
        matches.push({ id: user.id, email: user.email, created_at: user.created_at });
      }
    }
    if (data.users.length < 200) break;
    page += 1;
  }
  return matches;
}

async function deleteUser(userId) {
  // ON DELETE CASCADE on profiles.id removes the profile row.
  // businesses, promotions, etc. are cleaned up by their respective FK cascades
  // OR remain orphaned if FK is ON DELETE SET NULL.
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw error;
}

async function deleteOrphanedBusinesses(emails) {
  if (emails.length === 0) return 0;
  // Some businesses might exist without a matching auth.users row if cleanup
  // ran but the business was created by an admin invite that we manually backed out.
  const { data, error } = await supabase
    .from('businesses')
    .delete()
    .in('owner_email', emails)
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}

async function main() {
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'DELETE'}`);
  console.log(`Target: ${supabaseUrl}\n`);

  const users = await listE2eUsers();
  console.log(`Found ${users.length} e2e-* test users in auth.users:`);
  for (const user of users) {
    console.log(`  ${user.email} (created ${user.created_at})`);
  }

  if (users.length === 0) {
    console.log('\nNothing to clean up.');
    return;
  }

  if (dryRun) {
    console.log('\n--dry-run set; no deletes performed.');
    return;
  }

  console.log('\nDeleting auth users (profiles will cascade via FK)...');
  let deleted = 0;
  let failed = 0;
  for (const user of users) {
    try {
      await deleteUser(user.id);
      deleted += 1;
    } catch (err) {
      console.error(`  failed: ${user.email}: ${err.message}`);
      failed += 1;
    }
  }
  console.log(`  ${deleted} deleted, ${failed} failed`);

  // Sweep up any orphaned business rows in case the FK behavior changed.
  const emails = users.map((u) => u.email).filter(Boolean);
  const orphans = await deleteOrphanedBusinesses(emails);
  if (orphans > 0) {
    console.log(`  Removed ${orphans} orphaned business rows.`);
  }

  console.log('\nCleanup complete.');
}

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
