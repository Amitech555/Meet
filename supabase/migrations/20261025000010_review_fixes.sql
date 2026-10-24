-- Revue de fin de phase (sécurité / anti-spam) :
-- 1. create_session : les abonnés d'un organisateur ne sont plus prévenus des sessions d'un groupe privé dont ils ne sont pas membres.
-- 2. Anti-spam : 5 groupes créés et 20 signalements par 24 h et par personne.
-- 3. Favoris (P1) : my_saved_sessions().

-- Crée une session (et ses occurrences si récurrente). L'organisateur est inscrit d'office.
create or replace function public.create_session(
  p_category_id integer,
  p_title text,
  p_description text,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_venue_name text,
  p_address text,
  p_lat double precision,
  p_lng double precision,
  p_min_players smallint,
  p_max_players smallint,
  p_level public.session_level default 'all',
  p_price_cents integer default 0,
  p_cancellation_policy public.cancellation_policy default 'flexible',
  p_cover_url text default null,
  p_recurrence_rule text default null,
  p_group_id uuid default null,
  p_occurrences integer default 8
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_ready_user();
  city smallint;
  series uuid := case when p_recurrence_rule is not null then gen_random_uuid() end;
  step interval := case p_recurrence_rule when 'FREQ=WEEKLY;INTERVAL=2' then interval '14 days' else interval '7 days' end;
  first_id uuid;
  new_id uuid;
  i integer;
  n integer := case when p_recurrence_rule is null then 1 else least(greatest(p_occurrences, 2), 12) end;
  recent integer;
begin
  if p_starts_at <= now() + interval '15 minutes' then
    raise exception 'starts_in_past' using errcode = 'P0001';
  end if;
  if p_starts_at > now() + interval '180 days' then
    raise exception 'starts_too_far' using errcode = 'P0001';
  end if;
  if p_duration_minutes not between 15 and 720 then
    raise exception 'invalid_duration' using errcode = 'P0001';
  end if;
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'invalid_location' using errcode = 'P0001';
  end if;
  if p_price_cents > 0 and p_price_cents < 100 then
    raise exception 'invalid_price' using errcode = 'P0001';
  end if;
  if p_group_id is not null and not public.is_group_admin(p_group_id, uid) then
    raise exception 'not_group_admin' using errcode = 'P0001';
  end if;

  -- Anti-spam : 10 sessions créées par 24 h maximum
  select count(distinct coalesce(series_id, id)) into recent
  from public.sessions where host_id = uid and created_at > now() - interval '24 hours';
  if recent >= 10 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  -- Ville la plus proche parmi les villes actives (50 km)
  select c.id into city
  from public.cities c
  where c.is_active
    and extensions.st_dwithin(c.location, extensions.st_point(p_lng, p_lat, 4326)::extensions.geography, 50000)
  order by c.location operator(extensions.<->) extensions.st_point(p_lng, p_lat, 4326)::extensions.geography
  limit 1;
  if city is null then
    raise exception 'city_not_supported' using errcode = 'P0001';
  end if;

  for i in 0 .. n - 1 loop
    insert into public.sessions (
      host_id, group_id, category_id, title, description, starts_at, ends_at, venue_name, address, location,
      city_id, min_players, max_players, level, price_cents, cancellation_policy, cover_url, recurrence_rule, series_id
    ) values (
      uid, p_group_id, p_category_id, btrim(p_title), nullif(btrim(p_description), ''),
      p_starts_at + step * i, p_starts_at + step * i + make_interval(mins => p_duration_minutes),
      btrim(p_venue_name), nullif(btrim(p_address), ''), extensions.st_point(p_lng, p_lat, 4326)::extensions.geography,
      city, p_min_players, p_max_players, p_level, p_price_cents, p_cancellation_policy, p_cover_url, p_recurrence_rule, series
    ) returning id into new_id;

    insert into public.session_participants (session_id, user_id, status) values (new_id, uid, 'joined');
    if i = 0 then first_id := new_id; end if;
  end loop;

  -- Prévenir les abonnés (organisateur ou groupe) — une notification pour la première occurrence
  insert into public.notifications (user_id, kind, session_id, payload)
  select distinct f.follower_id, 'new_from_followed', first_id,
         jsonb_build_object('title', btrim(p_title), 'host_name', (select display_name from public.profiles where id = uid))
  from public.follows f
  where (f.host_id = uid or (p_group_id is not null and f.group_id = p_group_id))
    and f.follower_id <> uid
    -- Groupe privé : seuls les membres sont prévenus (pas de fuite du titre aux abonnés de l'organisateur)
    and (p_group_id is null
      or exists (select 1 from public.groups g where g.id = p_group_id and g.visibility = 'public')
      or public.is_group_member(p_group_id, f.follower_id));

  return first_id;
end $$;

create or replace function public.limit_per_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
  max_per_day integer := tg_argv[1]::integer;
begin
  execute format('select count(*) from public.%I where %I = $1 and created_at > now() - interval ''24 hours''', tg_table_name, tg_argv[0])
    into recent using (to_jsonb(new) ->> tg_argv[0])::uuid;
  if recent >= max_per_day then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger groups_rate_limit before insert on public.groups
  for each row execute function public.limit_per_day('owner_id', '5');
create trigger reports_rate_limit before insert on public.reports
  for each row execute function public.limit_per_day('reporter_id', '20');

create or replace function public.my_saved_sessions()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.session_card_json(s) order by s.starts_at), '[]'::jsonb)
  from public.saved_sessions ss
  join public.sessions s on s.id = ss.session_id
  where ss.user_id = auth.uid() and s.ends_at > now() and public.can_view_session(s.id, auth.uid())
$$;
revoke execute on function public.my_saved_sessions() from public, anon;
grant execute on function public.my_saved_sessions() to authenticated;
