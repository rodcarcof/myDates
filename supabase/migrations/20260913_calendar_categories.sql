create table public.calendar_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  icon text not null default '●',
  color text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.calendar_categories enable row level security;

create policy "Usuarios gestionan sus categorías de calendario"
on public.calendar_categories for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

alter table public.calendar_events
  add column if not exists category_id uuid references public.calendar_categories(id) on delete set null;

alter table public.calendar_events drop constraint if exists calendar_events_category_check;

create index if not exists calendar_categories_user_id_idx on public.calendar_categories(user_id);
create index if not exists calendar_events_category_id_idx on public.calendar_events(category_id);
