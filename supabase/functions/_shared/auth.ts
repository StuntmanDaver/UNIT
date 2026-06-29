// Shared authorization helper for internal / system Edge Functions.
//
// These functions perform privileged, service-role work (sending email,
// mutating promotion/invoice/escalation state) and must NOT be invokable by
// holders of the PUBLIC anon key that ships in the mobile bundle. Supabase's
// gateway `verify_jwt` only proves "a valid project JWT" — which the anon key
// satisfies — so we additionally require the caller to present the project's
// service-role key as the bearer token.
//
// Legitimate callers already do this:
//   - internal `supabase.functions.invoke()` from a service-role client
//   - pg_cron, which reads the service-role key from Vault (see the
//     expire-promotions cron migration)

const encoder = new TextEncoder();

function timingSafeEqual(a: string, b: string): boolean {
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

/** True iff the request bears the project service-role key as its bearer token. */
export function isServiceRoleCaller(req: Request): boolean {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return token.length > 0 && serviceKey.length > 0 && timingSafeEqual(token, serviceKey);
}

export function forbiddenResponse(corsHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
