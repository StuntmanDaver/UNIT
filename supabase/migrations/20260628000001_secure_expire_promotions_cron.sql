-- Secure the expire-promotions cron.
--
-- expire-promotions now rejects any caller that does not present the
-- service-role key (see _shared/auth.ts). This reschedules the nightly job to
-- send that key as a Bearer token, read from Vault.
--
-- The Vault lookup lives INSIDE the job body string, so it is evaluated only
-- when the job fires — not when this migration is applied. That keeps the
-- migration safe in local/CI databases (supabase start / db test), where the
-- secret does not exist and the cron never actually runs.
--
-- ===== ONE-TIME PRODUCTION SETUP (run once; do NOT commit the key) =====
--   select vault.create_secret('<SUPABASE_SERVICE_ROLE_KEY>', 'service_role_key');
-- Provision this before the next nightly run; otherwise expiry pauses (the
-- function will 403 the unauthenticated call) until the secret is present.
-- ======================================================================

select cron.unschedule('expire-promotions-nightly')
where exists (select 1 from cron.job where jobname = 'expire-promotions-nightly');

select cron.schedule(
  'expire-promotions-nightly',
  '0 0 * * *',
  $cron$
    select net.http_post(
      url := 'https://ouvneoaqoilnigynlvbp.supabase.co/functions/v1/expire-promotions',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(
          (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
          ''
        )
      ),
      body := '{}'::jsonb
    )
  $cron$
);
