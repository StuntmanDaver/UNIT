import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'UNIT <noreply@unit-app.com>';

  // Verify caller is a landlord
  const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller } } = await callerClient.auth.getUser();
  if (!caller) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const { data: callerProfile } = await callerClient
    .from('profiles')
    .select('role, property_ids')
    .eq('id', caller.id)
    .single();
  if (callerProfile?.role !== 'landlord') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { tenants } = await req.json();

  const results = { imported: 0, failed: [] as Array<{ email: string; reason: string }>, total: tenants.length };
  const allowedPropertyIds: string[] = callerProfile?.property_ids ?? [];

  for (const tenant of tenants) {
    try {
      if (!tenant.email || !tenant.business_name || !tenant.category || !tenant.property_id) {
        results.failed.push({ email: tenant.email ?? 'unknown', reason: 'Missing required fields' });
        continue;
      }

      if (!allowedPropertyIds.includes(tenant.property_id)) {
        results.failed.push({ email: tenant.email, reason: 'Forbidden: Access to property denied' });
        continue;
      }

      // Check if user already exists
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const exists = existingUsers?.users?.some((u: { email?: string }) => u.email === tenant.email);
      if (exists) {
        results.failed.push({ email: tenant.email, reason: 'Account already exists' });
        continue;
      }

      // Generate temp password
      const tempPassword = crypto.randomUUID().slice(0, 12);

      // Create auth user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: tenant.email,
        password: tempPassword,
        email_confirm: true,
      });
      if (createError || !newUser.user) {
        results.failed.push({ email: tenant.email, reason: createError?.message ?? 'Failed to create user' });
        continue;
      }

      // Update profile (auto-trigger already created it)
      await adminClient
        .from('profiles')
        .update({
          status: 'invited',
          needs_password_change: true,
          property_ids: [tenant.property_id],
          invited_at: new Date().toISOString(),
        })
        .eq('id', newUser.user.id);

      // Create business record
      await adminClient.from('businesses').insert({
        property_id: tenant.property_id,
        owner_email: tenant.email,
        business_name: tenant.business_name,
        category: tenant.category,
        contact_name: tenant.contact_name ?? null,
        contact_phone: tenant.contact_phone ?? null,
        business_description: tenant.description ?? null,
      });

      // Send invite email via Resend
      if (resendApiKey) {
        const { data: property } = await adminClient
          .from('properties')
          .select('name')
          .eq('id', tenant.property_id)
          .single();

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: resendFromEmail,
            to: tenant.email,
            subject: `You're invited to UNIT — ${property?.name ?? 'Your Property'}`,
            html: `
              <h2>Welcome to UNIT</h2>
              <p>You've been added to UNIT, the tenant networking app for <strong>${property?.name ?? 'your property'}</strong>.</p>
              <p><strong>Your login credentials:</strong></p>
              <p>Email: ${tenant.email}<br>Temporary Password: ${tempPassword}</p>
              <p>On your first login, you'll be asked to set a new password.</p>
              <p>— The UNIT Team</p>
            `,
          }),
        });
      }

      results.imported++;
    } catch (error) {
      results.failed.push({
        email: tenant.email ?? 'unknown',
        reason: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
