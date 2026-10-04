alter table public.calendar_events
add column if not exists timer_elapsed_seconds integer not null default 0,
add column if not exists timer_started_at timestamptz,
add column if not exists occurrence_timers jsonb;
