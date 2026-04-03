import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const today = new Date().toISOString().split('T')[0];

  // Find all 'sent' invoices past due_date (per D-03)
  const { data: overdueInvoices, error: fetchError } = await supabase
    .from('invoices')
    .select('id, status')
    .eq('status', 'sent')
    .lt('due_date', today);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  let processed = 0;
  for (const invoice of overdueInvoices ?? []) {
    // Update to overdue
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ status: 'overdue' })
      .eq('id', invoice.id);

    if (updateError) continue;

    // Write audit entry — system actor
    await supabase.from('audit_log').insert({
      entity_type: 'invoice',
      entity_id: invoice.id,
      action: 'status_changed',
      old_value: { status: 'sent' },
      new_value: { status: 'overdue' },
      performed_by_user_id: null,
      performed_by_email: 'system@cron'
    });

    processed++;
  }

  return new Response(JSON.stringify({ processed, total: overdueInvoices?.length ?? 0 }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
