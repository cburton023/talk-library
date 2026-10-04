-- Talk Library: one row of JSON per signed-in person (history, favorites, playlists, time listened).
-- Paste into Supabase → SQL Editor → Run.
create table if not exists public.user_data (
  user_id    uuid primary key default auth.uid() references auth.users on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;
drop policy if exists "own row: read"   on public.user_data;
drop policy if exists "own row: insert" on public.user_data;
drop policy if exists "own row: update" on public.user_data;
create policy "own row: read"   on public.user_data for select using (auth.uid() = user_id);
create policy "own row: insert" on public.user_data for insert with check (auth.uid() = user_id);
create policy "own row: update" on public.user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
