type EdgeExceptionContext = {
  functionName: string;
  level?: 'error' | 'warning' | 'info';
  userId?: string | null;
  tags?: Record<string, string | number | boolean | null | undefined>;
  extra?: Record<string, unknown>;
};

type ParsedDsn = {
  dsn: string;
  envelopeUrl: string;
};

export async function captureEdgeException(
  error: unknown,
  context: EdgeExceptionContext
): Promise<void> {
  const parsedDsn = parseSentryDsn(Deno.env.get('SENTRY_DSN'));
  if (!parsedDsn) return;

  try {
    const eventId = crypto.randomUUID().replaceAll('-', '');
    const now = new Date().toISOString();
    const exception = normalizeException(error);
    const environment = Deno.env.get('APP_ENV') ?? Deno.env.get('ENVIRONMENT') ?? 'production';
    const release = Deno.env.get('SENTRY_RELEASE') ?? undefined;

    const event = {
      event_id: eventId,
      timestamp: now,
      platform: 'javascript',
      level: context.level ?? 'error',
      environment,
      release,
      logger: 'unit.supabase.edge',
      server_name: context.functionName,
      transaction: context.functionName,
      tags: compactTags({
        function: context.functionName,
        runtime: 'supabase-edge',
        ...context.tags,
      }),
      user: context.userId ? { id: context.userId } : undefined,
      exception: {
        values: [
          {
            type: exception.type,
            value: exception.message,
          },
        ],
      },
      extra: {
        ...context.extra,
        stack: exception.stack,
      },
    };

    const envelope = [
      JSON.stringify({ event_id: eventId, dsn: parsedDsn.dsn, sent_at: now }),
      JSON.stringify({ type: 'event' }),
      JSON.stringify(event),
    ].join('\n');

    await fetch(parsedDsn.envelopeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body: envelope,
    });
  } catch (captureError) {
    console.error('Sentry Edge capture failed:', captureError);
  }
}

function parseSentryDsn(rawDsn: string | undefined): ParsedDsn | null {
  if (!rawDsn) return null;

  try {
    const url = new URL(rawDsn);
    const projectId = url.pathname.replace(/^\/+/, '').split('/').pop();
    if (!projectId) return null;

    return {
      dsn: rawDsn,
      envelopeUrl: `${url.protocol}//${url.host}/api/${projectId}/envelope/`,
    };
  } catch {
    return null;
  }
}

function normalizeException(error: unknown): { type: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      type: error.name || 'Error',
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'string') {
    return { type: 'Error', message: error };
  }

  return { type: 'Error', message: JSON.stringify(error) };
}

function compactTags(
  tags: Record<string, string | number | boolean | null | undefined>
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(tags).filter(
      (entry): entry is [string, string | number | boolean] => entry[1] !== null && entry[1] !== undefined
    )
  );
}
