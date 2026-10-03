alter table public.calendar_events
add column if not exists reminder_enabled boolean not null default false,
add column if not exists reminder_notified_at jsonb;
