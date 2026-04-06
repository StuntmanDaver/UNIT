import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  sound: string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: Record<string, unknown>;
}

interface ExpoPushResponse {
  data: ExpoPushTicket[];
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
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Verify caller is authenticated
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await callerClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Parse and validate request body
  const body = await req.json() as {
    property_id?: string;
    title?: string;
    message?: string;
    data?: Record<string, unknown>;
    audience?: string;
    exclude_email?: string;
  };

  const { property_id, title, message, data, audience, exclude_email } = body;

  if (!property_id || !title || !message) {
    return new Response(
      JSON.stringify({ error: 'property_id, title, and message are required' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Use service role client to query profiles
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  let profilesQuery = adminClient
    .from('profiles')
    .select('email, push_token')
    .contains('property_ids', [property_id])
    .not('push_token', 'is', null);

  if (audience === 'active') {
    profilesQuery = profilesQuery.eq('status', 'active');
  }

  if (exclude_email) {
    profilesQuery = profilesQuery.neq('email', exclude_email);
  }

  const { data: profiles, error: profilesError } = await profilesQuery;

  if (profilesError) {
    return new Response(JSON.stringify({ error: profilesError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const targetedProfiles = profiles ?? [];
  const targetedEmails = targetedProfiles.map((p: { email: string }) => p.email);

  // Build push messages for profiles that have a push token
  const tokens: string[] = targetedProfiles
    .map((p: { email: string; push_token: string | null }) => p.push_token)
    .filter((t): t is string => t !== null);

  let sent = 0;
  let failed = 0;
  const total = tokens.length;

  // Send in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    const messages: PushMessage[] = batch.map((token) => ({
      to: token,
      title,
      body: message,
      data: data ?? {},
      sound: 'default',
    }));

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json() as ExpoPushResponse;
      const tickets = result.data ?? [];

      for (const ticket of tickets) {
        if (ticket.status === 'ok') {
          sent++;
        } else {
          failed++;
        }
      }
    } catch {
      // Count entire batch as failed if request itself errors
      failed += batch.length;
    }
  }

  // Insert notification records for ALL targeted users
  if (targetedEmails.length > 0) {
    const notificationRecords = targetedEmails.map((email: string) => ({
      user_email: email,
      property_id,
      type: (data?.type as string | undefined) ?? 'broadcast',
      title,
      message,
      data: data ?? null,
      read: false,
    }));

    await adminClient.from('notifications').insert(notificationRecords);
  }

  return new Response(JSON.stringify({ sent, failed, total }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
