-- ════════════════════════════════════════════════════════════════════
-- Trippy — initial schema
-- Tables, Row Level Security, Storage bucket + policies, triggers, realtime.
-- Run in the Supabase SQL editor or with `supabase db push`.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─── Helpers ────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── profiles ───────────────────────────────────────────────────────

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  name        text,
  avatar_url  text,
  preferences jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile row automatically for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Only the auth trigger should run this; don't expose it as an RPC endpoint.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── trips ──────────────────────────────────────────────────────────

create table if not exists public.trips (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name                    text not null check (char_length(name) between 1 and 120),
  destination             text,
  country                 text,
  country_code            text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  destination_source      text not null default 'ai' check (destination_source in ('user', 'ai')),
  start_date              date,
  end_date                date,
  cover_image_url         text,
  cover_image_source      text,
  cover_image_attribution text,
  cover_image_query       text,
  is_demo                 boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint trips_dates_valid check (end_date is null or start_date is null or end_date >= start_date)
);

create index if not exists trips_user_id_idx on public.trips (user_id, start_date);

drop trigger if exists trips_updated_at on public.trips;
create trigger trips_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- ─── tickets ────────────────────────────────────────────────────────

create table if not exists public.tickets (
  id                         uuid primary key default gen_random_uuid(),
  trip_id                    uuid not null references public.trips (id) on delete cascade,
  user_id                    uuid not null default auth.uid() references auth.users (id) on delete cascade,

  -- Source file (Supabase Storage, bucket "tickets")
  file_path                  text,
  file_name                  text,
  file_type                  text check (file_type in ('pdf', 'image')),
  mime_type                  text,
  file_size                  bigint,

  -- AI processing
  document_type              text not null default 'unknown' check (document_type in
                               ('flight', 'hotel', 'train', 'bus', 'restaurant', 'activity',
                                'generic_travel_document', 'unknown')),
  processing_status          text not null default 'uploaded' check (processing_status in
                               ('uploaded', 'processing', 'completed', 'failed')),
  error_message              text,
  raw_text                   text,
  structured_data            jsonb,
  confidence                 numeric(4, 3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  needs_review               boolean not null default false,

  -- Frequently queried / user-editable summary fields
  title                      text,
  summary                    text,
  provider_name              text,
  airline_name               text,
  airline_code               text,
  airline_logo_url           text,
  booking_platform           text,
  booking_platform_logo_url  text,
  provider_logo_url          text,
  image_url                  text,
  booking_reference          text,
  origin                     text,
  destination                text,
  travel_date                date,
  end_date                   date,
  start_time                 text check (start_time is null or start_time ~ '^\d{2}:\d{2}$'),
  end_time                   text check (end_time is null or end_time ~ '^\d{2}:\d{2}$'),
  notes                      text,

  is_demo                    boolean not null default false,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create index if not exists tickets_trip_id_idx on public.tickets (trip_id, travel_date);
create index if not exists tickets_user_id_idx on public.tickets (user_id, created_at desc);

drop trigger if exists tickets_updated_at on public.tickets;
create trigger tickets_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();

-- ─── trip_places ────────────────────────────────────────────────────

create table if not exists public.trip_places (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ticket_id   uuid references public.tickets (id) on delete cascade,
  place_name  text not null,
  place_type  text not null default 'city' check (place_type in ('city', 'hotel', 'airport', 'station', 'venue', 'country')),
  image_url   text,
  source      text,
  created_at  timestamptz not null default now(),
  unique (trip_id, place_name, place_type)
);

create index if not exists trip_places_trip_id_idx on public.trip_places (trip_id);

-- ════════════════════════════════════════════════════════════════════
-- Row Level Security — users only ever see their own rows.
-- ════════════════════════════════════════════════════════════════════

alter table public.profiles    enable row level security;
alter table public.trips       enable row level security;
alter table public.tickets     enable row level security;
alter table public.trip_places enable row level security;

-- profiles
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- trips
drop policy if exists "trips: read own" on public.trips;
create policy "trips: read own" on public.trips for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "trips: insert own" on public.trips;
create policy "trips: insert own" on public.trips for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "trips: update own" on public.trips;
create policy "trips: update own" on public.trips for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "trips: delete own" on public.trips;
create policy "trips: delete own" on public.trips for delete to authenticated using ((select auth.uid()) = user_id);

-- tickets (must belong to the user AND to a trip the user owns)
drop policy if exists "tickets: read own" on public.tickets;
create policy "tickets: read own" on public.tickets for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "tickets: insert own" on public.tickets;
create policy "tickets: insert own" on public.tickets for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid()))
  );
drop policy if exists "tickets: update own" on public.tickets;
create policy "tickets: update own" on public.tickets for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid()))
  );
drop policy if exists "tickets: delete own" on public.tickets;
create policy "tickets: delete own" on public.tickets for delete to authenticated
  using ((select auth.uid()) = user_id);

-- trip_places
drop policy if exists "trip_places: read own" on public.trip_places;
create policy "trip_places: read own" on public.trip_places for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "trip_places: insert own" on public.trip_places;
create policy "trip_places: insert own" on public.trip_places for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid()))
  );
drop policy if exists "trip_places: update own" on public.trip_places;
create policy "trip_places: update own" on public.trip_places for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "trip_places: delete own" on public.trip_places;
create policy "trip_places: delete own" on public.trip_places for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ════════════════════════════════════════════════════════════════════
-- Data API access — newer projects don't auto-expose SQL-created tables.
-- Only signed-in users get table privileges; RLS above limits them to their own rows.
-- ════════════════════════════════════════════════════════════════════

revoke all on public.profiles, public.trips, public.tickets, public.trip_places from anon;
grant select, insert, update, delete on public.profiles, public.trips, public.tickets, public.trip_places to authenticated;

-- ════════════════════════════════════════════════════════════════════
-- Storage — private bucket, files at {user_id}/{trip_id}/{ticket_id}/{filename}
-- ════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tickets',
  'tickets',
  false,
  20971520, -- 20 MB
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- The first folder segment must be the caller's user id.
drop policy if exists "tickets bucket: read own" on storage.objects;
create policy "tickets bucket: read own" on storage.objects for select to authenticated
  using (bucket_id = 'tickets' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "tickets bucket: upload own" on storage.objects;
create policy "tickets bucket: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'tickets' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "tickets bucket: update own" on storage.objects;
create policy "tickets bucket: update own" on storage.objects for update to authenticated
  using (bucket_id = 'tickets' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'tickets' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "tickets bucket: delete own" on storage.objects;
create policy "tickets bucket: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'tickets' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ════════════════════════════════════════════════════════════════════
-- Realtime — push ticket/trip changes to the client (RLS still applies).
-- ════════════════════════════════════════════════════════════════════

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.tickets;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.trips;
    exception when duplicate_object then null;
    end;
  end if;
end;
$$;
