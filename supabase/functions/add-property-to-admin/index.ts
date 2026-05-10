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
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Verify caller is a landlord
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

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role, property_ids')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'landlord') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { property_id } = await req.json();
  if (!property_id) {
    return new Response(JSON.stringify({ error: 'property_id is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: property } = await adminClient
    .from('properties')
    .select('id, created_at, created_by_landlord_id')
    .eq('id', property_id)
    .single();

  if (!property) {
    return new Response(JSON.stringify({ error: 'Property not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const createdAt = new Date(property.created_at).getTime();
  const tenMinutes = 10 * 60 * 1000;
  if (!Number.isFinite(createdAt) || Date.now() - createdAt > tenMinutes) {
    return new Response(JSON.stringify({ error: 'Only newly created properties can be assigned this way' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (property.created_by_landlord_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Only the property creator can self-assign this property' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: existingAdmins } = await adminClient
    .from('profiles')
    .select('id')
    .eq('role', 'landlord')
    .contains('property_ids', [property_id])
    .neq('id', user.id)
    .limit(1);

  if ((existingAdmins?.length ?? 0) > 0) {
    return new Response(JSON.stringify({ error: 'Property is already assigned to another admin' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Use service role to append to property_ids array
  const currentIds: string[] = profile.property_ids ?? [];

  // Prevent duplicate property_ids
  if (currentIds.includes(property_id)) {
    return new Response(
      JSON.stringify({ success: true, message: 'Property already assigned' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const updatedIds = [...currentIds, property_id];

  const { error } = await adminClient
    .from('profiles')
    .update({ property_ids: updatedIds })
    .eq('id', user.id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
