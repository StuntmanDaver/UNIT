-- Enable required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule nightly expiry of promotions at midnight UTC
-- expire-promotions has verify_jwt=false so no auth header needed
select cron.schedule(
  'expire-promotions-nightly',
  '0 0 * * *',
  $$
    select net.http_post(
      url := 'https://ouvneoaqoilnigynlvbp.supabase.co/functions/v1/expire-promotions',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    )
  $$
);
