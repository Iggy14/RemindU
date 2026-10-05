-- RemindU 0004: call /api/send-reminders every 10 minutes.
-- Run in the Supabase SQL Editor AFTER deploying to Vercel and setting CRON_SECRET there.
--
-- Before running, replace the two placeholders below:
--   https://YOUR-APP.vercel.app  -> your deployed URL
--   YOUR_CRON_SECRET             -> the same value as the CRON_SECRET env var in Vercel
-- Do not commit the real values.

create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.schedule(
  'send-reminders',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://remind-u-ivory.vercel.app/api/send-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET')
  );
  $$
);

-- To stop: select cron.unschedule('send-reminders');
