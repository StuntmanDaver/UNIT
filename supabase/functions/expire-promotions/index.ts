import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const today = new Date().toISOString().split('T')[0];

  // Find promotions that should be expired
  const { data: toExpire, error: fetchError } = await supabase
    .from('promotions')
    .select('id, review_status, payment_status')
    .in('review_status', ['approved', 'suspended'])
    .lt('end_date', today);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  let expired = 0;
  let failed = 0;
  for (const promo of toExpire ?? []) {
    const { error: updateError } = await supabase
      .from('promotions')
      .update({ review_status: 'expired' })
      .eq('id', promo.id);

    if (updateError) {
      failed++;
      continue;
    }

    const { error: insertError } = await supabase
      .from('promotion_status_events')
      .insert({
        promotion_id: promo.id,
        from_review_status: promo.review_status,
        to_review_status: 'expired',
        from_payment_status: promo.payment_status,
        to_payment_status: promo.payment_status,  // payment_status unchanged
        actor_type: 'system',
        actor_user_id: null,
        note: null,
      });

    if (!insertError) {
      expired++;
    } else {
      failed++;
    }
  }

  return new Response(JSON.stringify({ expired, failed }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
