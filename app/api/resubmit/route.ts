import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { promotionId } = await req.json();

  // Validate: advertiser owns it and it's in revision_requested + paid state
  const { data: promotion } = await supabase
    .from('promotions')
    .select('id, review_status, payment_status, advertiser_id')
    .eq('id', promotionId)
    .eq('advertiser_id', user.id)
    .single();

  if (!promotion) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (promotion.review_status !== 'revision_requested') {
    return NextResponse.json({ error: 'Promotion is not in revision_requested state' }, { status: 422 });
  }

  if (promotion.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Repayment required — use checkout flow' }, { status: 422 });
  }

  const serviceClient = createServiceRoleClient();

  await serviceClient
    .from('promotions')
    .update({ review_status: 'pending' })
    .eq('id', promotionId);

  await serviceClient.from('promotion_status_events').insert({
    promotion_id: promotionId,
    from_review_status: 'revision_requested',
    to_review_status: 'pending',
    from_payment_status: 'paid',
    to_payment_status: 'paid',
    actor_user_id: user.id,
    actor_type: 'advertiser',
    note: null,
  });

  return NextResponse.json({ success: true });
}
