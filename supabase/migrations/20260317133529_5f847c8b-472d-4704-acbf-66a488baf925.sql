
SELECT cron.schedule(
  'auto-clock-out-3am',
  '0 3 * * *',
  $$SELECT public.auto_clock_out_stale_shifts();$$
);
