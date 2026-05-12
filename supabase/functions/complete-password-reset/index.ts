import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0';
import { captureEdgeException } from '../_shared/sentry.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ResetPasswordInput = {
  password?: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await callerClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  let body: ResetPasswordInput;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  if (typeof body.password !== 'string' || body.password.length < 8) {
    return jsonResponse({ error: 'Password must be at least 8 characters' }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, needs_password_change')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    await captureEdgeException(profileError ?? new Error('Profile not found'), {
      functionName: 'complete-password-reset',
      userId: user.id,
      tags: { subsystem: 'profile_lookup' },
    });
    return jsonResponse({ error: 'Profile not found' }, 404);
  }

  const { error: passwordError } = await adminClient.auth.admin.updateUserById(user.id, {
    password: body.password,
  });

  if (passwordError) {
    await captureEdgeException(passwordError, {
      functionName: 'complete-password-reset',
      userId: user.id,
      tags: { subsystem: 'auth_password_update' },
    });
    return jsonResponse({ error: passwordError.message }, 500);
  }

  const { error: updateProfileError } = await adminClient
    .from('profiles')
    .update({ needs_password_change: false })
    .eq('id', user.id);

  if (updateProfileError) {
    await captureEdgeException(updateProfileError, {
      functionName: 'complete-password-reset',
      userId: user.id,
      tags: { subsystem: 'profile_reset_flag_update' },
    });
    return jsonResponse({ error: updateProfileError.message }, 500);
  }

  return jsonResponse({ success: true, needs_password_change: false });
});
