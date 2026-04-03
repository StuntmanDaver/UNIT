import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const now = new Date().toISOString();

  // Find unresolved requests past sla_deadline that are not already escalated (per D-08, REQ-05)
  const { data: breachedRequests, error: fetchError } = await supabase
    .from('recommendations')
    .select('id, status, sla_deadline, property_id')
    .eq('escalated', false)
    .not('status', 'in', '("resolved","closed")')
    .not('sla_deadline', 'is', null)
    .lt('sla_deadline', now);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  let processed = 0;
  const emailErrors: string[] = [];

  for (const request of breachedRequests ?? []) {
    // Mark as escalated
    const { error: updateError } = await supabase
      .from('recommendations')
      .update({ escalated: true })
      .eq('id', request.id);

    if (updateError) continue;

    // Write audit entry — system actor
    await supabase.from('audit_log').insert({
      entity_type: 'recommendation',
      entity_id: request.id,
      action: 'escalated',
      old_value: { escalated: false },
      new_value: { escalated: true },
      performed_by_user_id: null,
      performed_by_email: 'system@cron'
    });

    // Trigger escalation email to property manager (per D-08)
    try {
      const emailRes = await supabase.functions.invoke('send-escalation-email', {
        body: { requestId: request.id, propertyId: request.property_id }
      });
      if (emailRes.error) {
        emailErrors.push(`Request ${request.id}: ${emailRes.error.message}`);
      }
    } catch (emailErr) {
      // Email failure should not block escalation marking
      emailErrors.push(`Request ${request.id}: ${emailErr.message}`);
    }

    processed++;
  }

  return new Response(JSON.stringify({
    processed,
    total: breachedRequests?.length ?? 0,
    emailErrors: emailErrors.length ? emailErrors : undefined
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
