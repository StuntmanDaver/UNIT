import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } });
  }

  try {
    const { requestId, propertyId } = await req.json();
    if (!requestId || !propertyId) {
      return new Response(JSON.stringify({ error: 'requestId and propertyId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch the escalated request
    const { data: request, error: reqError } = await supabase
      .from('recommendations')
      .select('id, title, description, priority, category, status, sla_deadline, assigned_to, properties(name)')
      .eq('id', requestId)
      .single();

    if (reqError || !request) {
      return new Response(JSON.stringify({ error: 'Request not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find property manager(s) — landlords with this property_id in their property_ids array
    const { data: managers, error: mgrError } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'landlord')
      .contains('property_ids', [propertyId]);

    if (mgrError || !managers?.length) {
      return new Response(JSON.stringify({ error: 'No property managers found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const propertyName = request.properties?.name || 'Your Property';
    const appUrl = Deno.env.get('APP_URL') || 'https://yourapp.com';
    const requestLink = `${appUrl}/LandlordRequests?propertyId=${propertyId}`;
    const managerEmails = managers.map(m => m.email);

    // Send escalation email via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `UNIT <onboarding@resend.dev>`,
        to: managerEmails,
        subject: `[ESCALATED] Request "${request.title}" has breached SLA — ${propertyName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #101B29; padding: 20px 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; font-size: 18px; margin: 0;">UNIT — SLA Escalation</h1>
            </div>
            <div style="border: 1px solid #e5e7eb; border-top: 3px solid #DC2626; padding: 24px; border-radius: 0 0 8px 8px;">
              <p style="color: #374151; font-size: 16px;"><strong>A request has breached its SLA deadline.</strong></p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Request</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 600;">${request.title}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Priority</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 600;">${request.priority}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">SLA Deadline</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #DC2626;">${request.sla_deadline}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Assigned To</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 600;">${request.assigned_to || 'Unassigned'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Current Status</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 600;">${request.status}</td>
                </tr>
              </table>
              <a href="${requestLink}" style="display: inline-block; background: #DC2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 8px;">View Escalated Request</a>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">This is an automated escalation from UNIT for ${propertyName}.</p>
            </div>
          </div>
        `
      })
    });

    const emailResult = await emailRes.json();

    return new Response(JSON.stringify({ success: true, result: emailResult, sentTo: managerEmails }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
