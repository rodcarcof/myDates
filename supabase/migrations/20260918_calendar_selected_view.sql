alter table public.calendar_settings
add column if not exists selected_view text not null default 'week'
check (selected_view in ('day', 'three-days', 'five-days', 'week'));
