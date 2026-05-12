import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0';
import { captureEdgeException } from '../_shared/sentry.ts';

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

  // Get the calling user
  const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await callerClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { property_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const { property_id } = body;
  if (!property_id) {
    return new Response(JSON.stringify({ error: 'property_id is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify that the user actually created a business profile for this property
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: business } = await adminClient
    .from('businesses')
    .select('id')
    .eq('owner_email', user.email)
    .eq('property_id', property_id)
    .single();

  if (!business) {
    return new Response(JSON.stringify({ error: 'Forbidden: Must create a business profile first' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Use service role to update property_ids (RLS prevents client-side update)
  // Fetch existing property_ids first so we append rather than overwrite
  const { data: existingProfile } = await adminClient
    .from('profiles')
    .select('property_ids, status, activated_at')
    .eq('id', user.id)
    .single();
  const mergedPropertyIds = Array.from(
    new Set([...(existingProfile?.property_ids ?? []), property_id])
  );

  const { error } = await adminClient
    .from('profiles')
    .update({
      property_ids: mergedPropertyIds,
      status: existingProfile?.status === 'active' ? 'active' : 'invited',
      activated_at: existingProfile?.status === 'active' ? existingProfile.activated_at : null,
    })
    .eq('id', user.id);

  if (error) {
    await captureEdgeException(error, {
      functionName: 'complete-onboarding',
      userId: user.id,
      tags: { subsystem: 'profile_onboarding_update' },
      extra: { property_id },
    });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    success: true,
    status: existingProfile?.status === 'active' ? 'active' : 'pending_approval',
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
