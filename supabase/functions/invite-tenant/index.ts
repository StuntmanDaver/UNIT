// REQUIRES: Supabase project secrets RESEND_API_KEY (and optionally RESEND_FROM_EMAIL)
// set via `supabase secrets set RESEND_API_KEY=<key>`. Missing config returns 500
// per D-03c — configure, don't skip. See 02-01 Plan §BUG-07.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0';
import { captureEdgeException } from '../_shared/sentry.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TenantInviteInput = {
  email?: string;
  business_name?: string;
  category?: string;
  property_id?: string;
  contact_name?: string;
  contact_phone?: string;
  description?: string;
  unit_number?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseTenantInviteInput(value: unknown): TenantInviteInput {
  if (!isRecord(value)) return {};
  return {
    email: toOptionalString(value.email),
    business_name: toOptionalString(value.business_name),
    category: toOptionalString(value.category),
    property_id: toOptionalString(value.property_id),
    contact_name: toOptionalString(value.contact_name),
    contact_phone: toOptionalString(value.contact_phone),
    description: toOptionalString(value.description),
    unit_number: toOptionalString(value.unit_number),
  };
}

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
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY is not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

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
  const { data: callerProfile, error: callerProfileError } = await adminClient
    .from('profiles')
    .select('role, property_ids')
    .eq('id', caller.id)
    .single();

  if (callerProfileError) {
    return new Response(JSON.stringify({ error: callerProfileError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (callerProfile?.role !== 'landlord') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let requestBody: { tenants?: unknown[] };

  try {
    requestBody = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!Array.isArray(requestBody.tenants)) {
    return new Response(JSON.stringify({ error: 'tenants must be an array' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const tenants = requestBody.tenants.map(parseTenantInviteInput);
  const results = { imported: 0, failed: [] as Array<{ email: string; reason: string }>, total: tenants.length };
  const allowedPropertyIds: string[] = callerProfile?.property_ids ?? [];

  for (const tenant of tenants) {
    let createdUserId: string | null = null;
    let createdBusinessId: string | null = null;

    try {
      if (!tenant.email || !tenant.business_name || !tenant.category || !tenant.property_id) {
        results.failed.push({ email: tenant.email ?? 'unknown', reason: 'Missing required fields' });
        continue;
      }

      if (!allowedPropertyIds.includes(tenant.property_id)) {
        results.failed.push({ email: tenant.email, reason: 'Forbidden: Access to property denied' });
        continue;
      }

      // BUG-06: Check if user already exists via O(1) profile lookup instead of
      // O(n) auth.admin.listUsers pagination. The auto-profile trigger inserts a
      // row into public.profiles keyed on auth.users.email for every created
      // auth user, so a profile existence check is a reliable proxy.
      const { data: existingProfile, error: lookupError } = await adminClient
        .from('profiles')
        .select('id')
        .eq('email', tenant.email)
        .maybeSingle();

      if (lookupError) {
        results.failed.push({
          email: tenant.email,
          reason: `Lookup failed: ${lookupError.message}`,
        });
        continue;
      }

      if (existingProfile) {
        results.failed.push({ email: tenant.email, reason: 'Account already exists' });
        continue;
      }

      // BUG-08 / T-02-11: if a unit_number is supplied, reject the import if
      // that unit is already claimed on the same property. Without this check
      // two concurrent imports could silently write duplicate unit_numbers.
      // If unit_number is omitted, the import is allowed — the tenant claims
      // a unit at onboarding on first login.
      const unitNumber =
        typeof tenant.unit_number === 'string' && tenant.unit_number.trim().length > 0
          ? tenant.unit_number.trim()
          : null;

      if (unitNumber) {
        const { data: unitConflict } = await adminClient
          .from('businesses')
          .select('id')
          .eq('property_id', tenant.property_id)
          .eq('unit_number', unitNumber)
          .maybeSingle();
        if (unitConflict) {
          results.failed.push({
            email: tenant.email,
            reason: `Unit ${unitNumber} is already claimed on this property`,
          });
          continue;
        }
      }

      // Generate temp password — 16 random alphanumeric chars
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      const tempPassword = Array.from(bytes, (b) => chars[b % chars.length]).join('');

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

      createdUserId = newUser.user.id;

      // Update profile (auto-trigger already created it)
      const { error: profileError } = await adminClient
        .from('profiles')
        .update({
          status: 'invited',
          needs_password_change: true,
          property_ids: [tenant.property_id],
          invited_at: new Date().toISOString(),
        })
        .eq('id', newUser.user.id);

      if (profileError) {
        throw new Error(profileError.message);
      }

      // Create business record. BUG-08: persist unit_number when provided;
      // leaving it null allows the tenant to pick a unit during onboarding.
      const businessInsert: Record<string, unknown> = {
        property_id: tenant.property_id,
        owner_email: tenant.email,
        business_name: tenant.business_name,
        category: tenant.category,
        contact_name: tenant.contact_name ?? null,
        contact_phone: tenant.contact_phone ?? null,
        business_description: tenant.description ?? null,
        unit_number: unitNumber,
      };

      const { data: business, error: businessError } = await adminClient
        .from('businesses')
        .insert(businessInsert)
        .select('id')
        .single();

      if (businessError || !business) {
        throw new Error(businessError?.message ?? 'Failed to create business');
      }

      createdBusinessId = business.id;

      // Send invite email via Resend
      const { data: property } = await adminClient
        .from('properties')
        .select('name')
        .eq('id', tenant.property_id)
        .single();

      const resendResponse = await fetch('https://api.resend.com/emails', {
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

      if (!resendResponse.ok) {
        const resendError = await resendResponse.text();
        throw new Error(resendError || 'Failed to send invite email');
      }

      results.imported++;
    } catch (error) {
      await captureEdgeException(error, {
        functionName: 'invite-tenant',
        level: 'warning',
        userId: caller.id,
        tags: { subsystem: 'tenant_invite' },
        extra: {
          email: tenant.email,
          property_id: tenant.property_id,
          createdUserId,
          createdBusinessId,
        },
      });

      if (createdBusinessId) {
        await adminClient.from('businesses').delete().eq('id', createdBusinessId);
      }

      if (createdUserId) {
        await adminClient.auth.admin.deleteUser(createdUserId);
      }

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
