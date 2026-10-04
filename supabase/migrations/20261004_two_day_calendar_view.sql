alter table public.calendar_settings
drop constraint if exists calendar_settings_selected_view_check;

alter table public.calendar_settings
add constraint calendar_settings_selected_view_check
check (selected_view in ('day', 'two-days', 'three-days', 'five-days', 'week'));
