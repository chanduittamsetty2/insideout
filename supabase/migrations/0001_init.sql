-- InsideOut: initial schema
-- Run with the Supabase CLI (`npx supabase db push`) or paste into the SQL editor.

create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.section_key as enum ('kitchen', 'fridge', 'meat', 'veggies', 'food', 'dining');
create type public.media_kind as enum ('photo', 'video');
create type public.review_status as enum ('approved', 'rejected');
create type public.fssai_type as enum ('Registration', 'State License', 'Central License');
create type public.post_kind as enum ('offer', 'event');
create type public.restaurant_status as enum ('draft', 'live', 'suspended');
create type public.member_role as enum ('owner', 'staff');
create type public.event_kind as enum ('profile_view', 'kitchen_view', 'qr_scan');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null,
  tagline text,
  cuisines text[] not null default '{}',
  area text not null,
  address text not null,
  phone text,
  location extensions.geography (point, 4326),
  opens_at time,
  closes_at time,
  price_for_two int check (price_for_two > 0),
  is_veg boolean not null default false,
  sections public.section_key[] not null default '{kitchen,fridge,meat,veggies,food,dining}',
  google_place_id text unique,
  swiggy_url text,
  zomato_url text,
  cover_path text,
  status public.restaurant_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index restaurants_location_idx on public.restaurants using gist (location);
create index restaurants_status_idx on public.restaurants (status);

create table public.restaurant_members (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);

create table public.fssai_licenses (
  restaurant_id uuid primary key references public.restaurants (id) on delete cascade,
  license_number text not null check (license_number ~ '^\d{14}$'),
  license_type public.fssai_type not null,
  valid_till date,
  certificate_path text,
  verified_at timestamptz,
  verified_by uuid references auth.users (id)
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  section public.section_key not null,
  kind public.media_kind not null,
  storage_path text not null,
  caption text check (char_length(caption) <= 120),
  -- Always set by the database (see trigger below). Clients can't write or change it.
  captured_at timestamptz not null default now(),
  capture_lat double precision,
  capture_lng double precision,
  review public.review_status not null default 'approved',
  uploaded_by uuid references auth.users (id) default auth.uid()
);
create index media_latest_idx on public.media (restaurant_id, section, captured_at desc);

create table public.specials (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  price int not null check (price > 0),
  note text,
  media_id uuid references public.media (id) on delete set null,
  posted_at timestamptz not null default now()
);
create index specials_latest_idx on public.specials (restaurant_id, posted_at desc);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  kind public.post_kind not null,
  title text not null,
  detail text,
  ends_at timestamptz,
  posted_at timestamptz not null default now()
);

create table public.view_events (
  id bigint generated always as identity primary key,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  kind public.event_kind not null,
  source text check (source in ('table', 'counter', 'menu', 'receipt', 'entrance', 'search', 'share')),
  created_at timestamptz not null default now()
);
create index view_events_restaurant_idx on public.view_events (restaurant_id, kind, created_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  media_id uuid references public.media (id) on delete set null,
  reason text not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from app_admins where user_id = auth.uid());
$$;

create function public.is_member(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from restaurant_members where restaurant_id = rid and user_id = auth.uid());
$$;

create function public.is_live(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from restaurants where id = rid and status = 'live');
$$;

-- Freshness depends on this: upload time comes from the server clock and never changes.
create function public.media_server_timestamp() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.captured_at := now();
  elsif new.captured_at is distinct from old.captured_at then
    raise exception 'captured_at is immutable';
  end if;
  return new;
end;
$$;

create trigger media_server_timestamp
before insert or update on public.media
for each row execute function public.media_server_timestamp();

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger restaurants_touch before update on public.restaurants
for each row execute function public.touch_updated_at();

-- The creator of a restaurant becomes its owner.
create function public.add_owner_membership() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into restaurant_members (restaurant_id, user_id, role) values (new.id, auth.uid(), 'owner');
  return new;
end;
$$;

create trigger restaurants_add_owner after insert on public.restaurants
for each row execute function public.add_owner_membership();

-- ---------------------------------------------------------------------------
-- Freshness: green < 3 days, yellow < 30 days, red after that
-- ---------------------------------------------------------------------------
create view public.section_freshness with (security_invoker = true) as
select
  r.id as restaurant_id,
  s.section,
  m.captured_at,
  case
    when m.captured_at is null then 'none'
    when now() - m.captured_at < interval '3 days' then 'fresh'
    when now() - m.captured_at < interval '30 days' then 'aging'
    else 'outdated'
  end as level
from public.restaurants r
cross join lateral unnest(r.sections) as s (section)
left join lateral (
  select captured_at
  from public.media
  where restaurant_id = r.id and section = s.section and review = 'approved'
  order by captured_at desc
  limit 1
) m on true;

create function public.nearby_restaurants(lat double precision, lng double precision, radius_m int default 10000)
returns table (id uuid, slug text, name text, distance_m double precision)
language sql stable set search_path = public, extensions as $$
  select r.id, r.slug, r.name, st_distance(r.location, st_makepoint(lng, lat)::geography)
  from restaurants r
  where r.status = 'live' and st_dwithin(r.location, st_makepoint(lng, lat)::geography, radius_m)
  order by 4
  limit 50;
$$;

-- ---------------------------------------------------------------------------
-- Data API grants (new tables are not exposed automatically; RLS below still applies)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.restaurants, public.fssai_licenses, public.media, public.specials, public.posts, public.section_freshness
  to anon, authenticated;
grant insert on public.view_events, public.reports to anon, authenticated;

grant insert, update on public.restaurants to authenticated;
grant select on public.restaurant_members, public.app_admins, public.view_events to authenticated;
grant insert on public.fssai_licenses to authenticated;
grant insert, delete on public.media to authenticated;
grant update (review) on public.media to authenticated;
grant insert, update, delete on public.specials, public.posts to authenticated;
grant select, update on public.reports to authenticated;

grant execute on function public.nearby_restaurants(double precision, double precision, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.app_admins enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_members enable row level security;
alter table public.fssai_licenses enable row level security;
alter table public.media enable row level security;
alter table public.specials enable row level security;
alter table public.posts enable row level security;
alter table public.view_events enable row level security;
alter table public.reports enable row level security;

create policy "admins read admins" on public.app_admins for select using (public.is_admin());

create policy "public reads live restaurants" on public.restaurants for select
  using (status = 'live' or public.is_member(id) or public.is_admin());
create policy "signed-in users create restaurants" on public.restaurants for insert to authenticated
  with check (status = 'draft');
create policy "members update their restaurant" on public.restaurants for update to authenticated
  using (public.is_member(id) or public.is_admin());

create policy "members see their team" on public.restaurant_members for select to authenticated
  using (public.is_member(restaurant_id) or public.is_admin());

create policy "public reads fssai of live restaurants" on public.fssai_licenses for select
  using (public.is_live(restaurant_id) or public.is_member(restaurant_id) or public.is_admin());
create policy "members add fssai" on public.fssai_licenses for insert to authenticated
  with check (public.is_member(restaurant_id) and verified_at is null and verified_by is null);
create policy "members or admins update fssai" on public.fssai_licenses for update to authenticated
  using (public.is_member(restaurant_id) or public.is_admin());
-- Only admins (via service role) can mark FSSAI as verified.
revoke update on public.fssai_licenses from authenticated;
grant update (license_number, license_type, valid_till, certificate_path) on public.fssai_licenses to authenticated;

create policy "public reads approved media" on public.media for select
  using ((review = 'approved' and public.is_live(restaurant_id)) or public.is_member(restaurant_id) or public.is_admin());
create policy "members upload media" on public.media for insert to authenticated
  with check (public.is_member(restaurant_id));
create policy "members delete media" on public.media for delete to authenticated
  using (public.is_member(restaurant_id));
create policy "admins moderate media" on public.media for update to authenticated
  using (public.is_admin());

create policy "public reads specials" on public.specials for select
  using (public.is_live(restaurant_id) or public.is_member(restaurant_id));
create policy "members manage specials" on public.specials for all to authenticated
  using (public.is_member(restaurant_id)) with check (public.is_member(restaurant_id));

create policy "public reads posts" on public.posts for select
  using (public.is_live(restaurant_id) or public.is_member(restaurant_id));
create policy "members manage posts" on public.posts for all to authenticated
  using (public.is_member(restaurant_id)) with check (public.is_member(restaurant_id));

create policy "anyone logs views of live restaurants" on public.view_events for insert
  with check (public.is_live(restaurant_id));
create policy "members read their analytics" on public.view_events for select to authenticated
  using (public.is_member(restaurant_id) or public.is_admin());

create policy "anyone reports" on public.reports for insert with check (true);
create policy "admins read reports" on public.reports for select using (public.is_admin());
create policy "admins resolve reports" on public.reports for update using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: public `media` bucket, private `documents` bucket (FSSAI certificates)
-- Object paths start with the restaurant id: <restaurant_id>/<file>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']),
  ('documents', 'documents', false, 10485760, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

create policy "members upload to their folder" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('media', 'documents')
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );

create policy "members delete their media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_member(((storage.foldername(name))[1])::uuid));

create policy "members and admins read documents" on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and (public.is_member(((storage.foldername(name))[1])::uuid) or public.is_admin())
  );
