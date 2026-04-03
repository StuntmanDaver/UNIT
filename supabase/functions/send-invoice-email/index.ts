import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { invoiceId } = await req.json();
    if (!invoiceId) {
      return new Response(JSON.stringify({ error: 'invoiceId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Use service role to bypass RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch invoice with related business and property
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, invoice_number, amount, due_date, description, property_id, business_id, businesses(owner_email, business_name), properties(name)')
      .eq('id', invoiceId)
      .single();

    if (fetchError || !invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const ownerEmail = invoice.businesses?.owner_email;
    if (!ownerEmail) {
      return new Response(JSON.stringify({ error: 'No owner email on business' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const propertyName = invoice.properties?.name || 'Your Property';
    const appUrl = Deno.env.get('APP_URL') || 'https://yourapp.com';
    const invoiceLink = `${appUrl}/TenantInvoices?propertyId=${invoice.property_id}`;

    // Send via Resend API
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `UNIT <onboarding@resend.dev>`,
        to: [ownerEmail],
        subject: `Invoice ${invoice.invoice_number} from ${propertyName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #101B29; padding: 20px 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; font-size: 18px; margin: 0;">UNIT</h1>
            </div>
            <div style="border: 1px solid #e5e7eb; border-top: 3px solid #465A75; padding: 24px; border-radius: 0 0 8px 8px;">
              <p style="color: #374151; font-size: 16px;">Hi ${invoice.businesses?.business_name || 'Tenant'},</p>
              <p style="color: #374151;">You have a new invoice from <strong>${propertyName}</strong>.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Invoice Number</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 600;">${invoice.invoice_number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 600;">$${Number(invoice.amount).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Due Date</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 600;">${invoice.due_date}</td>
                </tr>
              </table>
              <a href="${invoiceLink}" style="display: inline-block; background: linear-gradient(to right, #465A75, #101B29); color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 8px;">View Invoice</a>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">This email was sent by UNIT on behalf of ${propertyName}.</p>
            </div>
          </div>
        `
      })
    });

    const emailResult = await emailRes.json();

    return new Response(JSON.stringify({ success: true, result: emailResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
