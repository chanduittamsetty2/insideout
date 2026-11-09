-- Columns and rules the web app needs: plain coordinates, cached Google data,
-- demo flags, reviews, owner analytics and admin-only fields.

drop function if exists public.nearby_restaurants(double precision, double precision, int);
alter table public.restaurants drop column if exists location;

alter table public.restaurants
  add column lat double precision,
  add column lng double precision,
  add column google_rating numeric(2, 1),
  add column google_rating_count int,
  add column google_maps_url text,
  add column google_synced_at timestamptz,
  add column is_demo boolean not null default false,
  add column stats_baseline jsonb not null default '{}';

alter table public.specials add column image_path text;

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  body text not null,
  created_at timestamptz not null default now()
);
create index reviews_restaurant_idx on public.reviews (restaurant_id, created_at desc);
alter table public.reviews enable row level security;
create policy "public reads reviews of live restaurants" on public.reviews for select
  using (public.is_live(restaurant_id) or public.is_member(restaurant_id) or public.is_admin());
grant select on public.reviews to anon, authenticated;

-- End users always get the server clock. Seed/admin scripts (service role) may backdate.
create or replace function public.media_server_timestamp() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(auth.role(), '') in ('anon', 'authenticated') then
      new.captured_at := now();
    end if;
  elsif new.captured_at is distinct from old.captured_at then
    raise exception 'captured_at is immutable';
  end if;
  return new;
end;
$$;

create or replace function public.add_owner_membership() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    insert into restaurant_members (restaurant_id, user_id, role) values (new.id, auth.uid(), 'owner');
  end if;
  return new;
end;
$$;

-- Owners can't flag demo data, inflate stats, verify themselves or undo a suspension.
create function public.restaurants_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') not in ('anon', 'authenticated') or is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.is_demo := false;
    new.stats_baseline := '{}';
    new.status := 'draft';
  else
    new.is_demo := old.is_demo;
    new.stats_baseline := old.stats_baseline;
    if old.status = 'suspended' or new.status = 'suspended' then
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;

create trigger restaurants_guard before insert or update on public.restaurants
for each row execute function public.restaurants_guard();

create function public.restaurant_stats(rid uuid) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'profileViews', coalesce((r.stats_baseline ->> 'profileViews')::int, 0)
      + (select count(*) from view_events where restaurant_id = rid and kind = 'profile_view'),
    'kitchenViews', coalesce((r.stats_baseline ->> 'kitchenViews')::int, 0)
      + (select count(*) from view_events where restaurant_id = rid and kind = 'kitchen_view'),
    'qrScans', coalesce((r.stats_baseline ->> 'qrScans')::int, 0)
      + (select count(*) from view_events where restaurant_id = rid and kind = 'qr_scan'),
    'reviews', coalesce((r.stats_baseline ->> 'reviews')::int, 0)
      + (select count(*) from reviews where restaurant_id = rid)
  )
  from restaurants r
  where r.id = rid and (is_member(rid) or is_admin());
$$;
grant execute on function public.restaurant_stats(uuid) to authenticated;

create function public.nearby_restaurants(lat double precision, lng double precision, radius_m int default 10000)
returns table (id uuid, slug text, name text, distance_m double precision)
language sql stable set search_path = public, extensions as $$
  select r.id, r.slug, r.name, st_distance(st_makepoint(r.lng, r.lat)::geography, st_makepoint(lng, lat)::geography)
  from restaurants r
  where r.status = 'live' and r.lat is not null
    and st_dwithin(st_makepoint(r.lng, r.lat)::geography, st_makepoint(lng, lat)::geography, radius_m)
  order by 4
  limit 50;
$$;
grant execute on function public.nearby_restaurants(double precision, double precision, int) to anon, authenticated;
