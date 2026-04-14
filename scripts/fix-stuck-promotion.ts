/**
 * fix-stuck-promotion.ts
 *
 * One-off reconciliation tool for promotions that paid successfully in Stripe
 * but whose DB row was never updated (i.e. webhook never fired or failed).
 *
 * Run from portal/:
 *   node --env-file=.env.local --import tsx scripts/fix-stuck-promotion.ts
 *       → dry run: lists promotions that look stuck (unpaid row + completed attempt)
 *
 *   node --env-file=.env.local --import tsx scripts/fix-stuck-promotion.ts <promotion-id>
 *       → fix one: updates row to paid + pending and inserts a status event
 *
 * If `tsx` is not installed in portal, run via npx:
 *   npx tsx scripts/fix-stuck-promotion.ts [<promotion-id>]
 * (ensure env vars are exported first, e.g. `set -a; source .env.local; set +a`)
 *
 * Idempotent: running twice on the same id is a no-op after the first fix.
 * Uses SUPABASE_SERVICE_ROLE_KEY and does NOT import next/headers, so it runs
 * outside of Next.js.
 */

import { createClient } from '@supabase/supabase-js';

type StuckRow = {
  id: string;
  review_status: string;
  payment_status: string | null;
  created_at: string;
};

async function main(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      '[fix-stuck-promotion] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.'
    );
    console.error(
      '[fix-stuck-promotion] Run with: node --env-file=.env.local --import tsx scripts/fix-stuck-promotion.ts'
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const targetId = process.argv[2];

  if (!targetId) {
    // Dry-run: list promotions that look stuck.
    // Stuck = promotions.payment_status = 'unpaid' AND there exists
    // a promotion_payment_attempts row with status = 'completed'.
    console.log('[fix-stuck-promotion] DRY RUN — listing stuck promotions…');

    const { data: stuckAttempts, error: attemptsErr } = await supabase
      .from('promotion_payment_attempts')
      .select('promotion_id, stripe_checkout_session_id, status')
      .eq('status', 'completed');

    if (attemptsErr) {
      console.error('[fix-stuck-promotion] Failed to query attempts:', attemptsErr.message);
      process.exit(1);
    }

    const candidateIds = Array.from(
      new Set((stuckAttempts ?? []).map((r) => r.promotion_id).filter((x): x is string => !!x))
    );

    if (candidateIds.length === 0) {
      console.log('[fix-stuck-promotion] No completed payment attempts found. Nothing to check.');
      process.exit(0);
    }

    const { data: promos, error: promosErr } = await supabase
      .from('promotions')
      .select('id, review_status, payment_status, created_at')
      .in('id', candidateIds)
      .eq('payment_status', 'unpaid');

    if (promosErr) {
      console.error('[fix-stuck-promotion] Failed to query promotions:', promosErr.message);
      process.exit(1);
    }

    const stuck = (promos ?? []) as StuckRow[];

    if (stuck.length === 0) {
      console.log('[fix-stuck-promotion] No stuck promotions found. All clear.');
      process.exit(0);
    }

    console.log(`[fix-stuck-promotion] Found ${stuck.length} stuck promotion(s):`);
    for (const row of stuck) {
      console.log(
        `  - id=${row.id}  review=${row.review_status}  payment=${row.payment_status}  created=${row.created_at}`
      );
    }
    console.log(
      '\n[fix-stuck-promotion] To fix one, re-run with the id:\n  node --env-file=.env.local --import tsx scripts/fix-stuck-promotion.ts <id>'
    );
    process.exit(0);
  }

  // Targeted fix for a specific promotion id.
  console.log(`[fix-stuck-promotion] Fetching promotion ${targetId}…`);

  const { data: before, error: beforeErr } = await supabase
    .from('promotions')
    .select('id, review_status, payment_status')
    .eq('id', targetId)
    .single();

  if (beforeErr || !before) {
    console.error(
      `[fix-stuck-promotion] Could not load promotion ${targetId}:`,
      beforeErr?.message ?? 'not found'
    );
    process.exit(1);
  }

  console.log(
    `[fix-stuck-promotion] BEFORE: review_status=${before.review_status} payment_status=${before.payment_status}`
  );

  if (before.payment_status === 'paid') {
    console.log('[fix-stuck-promotion] Already reconciled (payment_status=paid). No-op.');
    process.exit(0);
  }

  const { error: updateErr } = await supabase
    .from('promotions')
    .update({ payment_status: 'paid', review_status: 'pending' })
    .eq('id', targetId);

  if (updateErr) {
    console.error('[fix-stuck-promotion] Update failed:', updateErr.message);
    process.exit(1);
  }

  const { error: eventErr } = await supabase.from('promotion_status_events').insert({
    promotion_id: targetId,
    from_review_status: before.review_status,
    to_review_status: 'pending',
    from_payment_status: before.payment_status,
    to_payment_status: 'paid',
    actor_type: 'system',
    actor_user_id: null,
    note: 'Manual reconciliation via fix-stuck-promotion.ts',
  });

  if (eventErr) {
    console.error('[fix-stuck-promotion] Status event insert failed:', eventErr.message);
    // Continue — update already succeeded, but surface the problem.
  }

  const { data: after, error: afterErr } = await supabase
    .from('promotions')
    .select('id, review_status, payment_status')
    .eq('id', targetId)
    .single();

  if (afterErr || !after) {
    console.error('[fix-stuck-promotion] Could not verify post-update state:', afterErr?.message);
    process.exit(1);
  }

  console.log(
    `[fix-stuck-promotion] AFTER:  review_status=${after.review_status} payment_status=${after.payment_status}`
  );
  console.log('[fix-stuck-promotion] Done.');
}

main().catch((err) => {
  console.error('[fix-stuck-promotion] Unhandled error:', err);
  process.exit(1);
});
