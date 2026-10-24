-- Partants — fonctions métier et triggers.
-- Règle : toute écriture sensible passe par une fonction SECURITY DEFINER qui revalide tout côté serveur.
-- Les codes d'erreur (« message ») sont des clés stables que l'app traduit (errors.*).

-- Utilitaires ----------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger sessions_touch before update on public.sessions
  for each row execute function public.touch_updated_at();
create trigger session_participants_touch before update on public.session_participants
  for each row execute function public.touch_updated_at();

-- Blocage dans un sens ou dans l'autre
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  )
$$;

create or replace function public.is_group_member(p_group_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.group_members where group_id = p_group_id and user_id = p_user_id)
$$;

create or replace function public.is_group_admin(p_group_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_user_id and role = 'admin'
  )
$$;

-- Peut-on voir cette session ? (publiée/annulée/terminée, et membre si groupe privé)
create or replace function public.can_view_session(p_session_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.sessions s
    left join public.groups g on g.id = s.group_id
    where s.id = p_session_id
      and (
        s.host_id = p_user_id
        or (
          s.status <> 'draft'
          and (g.id is null or g.visibility = 'public' or public.is_group_member(g.id, p_user_id))
        )
      )
  )
$$;

-- Participant (inscrit, présent) ou organisateur : accès au chat de session
create or replace function public.is_session_member(p_session_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.sessions where id = p_session_id and host_id = p_user_id)
      or exists (
        select 1 from public.session_participants
        where session_id = p_session_id and user_id = p_user_id and status in ('joined', 'attended')
      )
$$;

-- Deux personnes ont-elles partagé une session ? (condition d'un futur DM)
create or replace function public.shares_session(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.session_participants pa
    join public.session_participants pb on pb.session_id = pa.session_id
    where pa.user_id = a and pb.user_id = b
      and pa.status in ('joined', 'attended') and pb.status in ('joined', 'attended')
  )
$$;

create or replace function public.require_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  return uid;
end $$;

-- Utilisateur prêt à agir : 18+ confirmé, conditions acceptées, non banni
create or replace function public.require_ready_user()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_user();
  p public.profiles;
begin
  select * into p from public.profiles where id = uid;
  if p.id is null or p.adult_confirmed_at is null or p.terms_accepted_at is null then
    raise exception 'terms_required' using errcode = 'P0001';
  end if;
  if p.is_banned then
    raise exception 'blocked' using errcode = 'P0001';
  end if;
  return uid;
end $$;

-- Profils --------------------------------------------------------------------

-- Crée le profil à l'inscription (Apple / Google / courriel)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  name text := coalesce(
    nullif(new.raw_user_meta_data ->> 'given_name', ''),
    nullif(split_part(new.raw_user_meta_data ->> 'full_name', ' ', 1), ''),
    nullif(split_part(new.raw_user_meta_data ->> 'name', ' ', 1), ''),
    ''
  );
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(name, 40))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Termine l'inscription : prénom, 18+ (date non conservée), conditions, ville, intérêts.
create or replace function public.complete_profile(
  p_display_name text,
  p_birthdate date,
  p_terms_version text,
  p_city_id smallint default null,
  p_interest_ids integer[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_user();
  name text := btrim(p_display_name);
begin
  if char_length(name) < 1 or char_length(name) > 40 then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;
  if p_birthdate is null or p_birthdate > (current_date - interval '18 years')::date then
    raise exception 'underage' using errcode = 'P0001';
  end if;
  if p_birthdate < date '1900-01-01' then
    raise exception 'invalid_birthdate' using errcode = 'P0001';
  end if;
  if coalesce(p_terms_version, '') = '' then
    raise exception 'terms_required' using errcode = 'P0001';
  end if;

  update public.profiles
  set display_name = name,
      adult_confirmed_at = coalesce(adult_confirmed_at, now()),
      terms_accepted_at = now(),
      terms_version = p_terms_version,
      city_id = coalesce(p_city_id, city_id)
  where id = uid;

  if coalesce(array_length(p_interest_ids, 1), 0) > 0 then
    insert into public.user_interests (user_id, category_id)
    select uid, c.id from public.categories c where c.id = any (p_interest_ids)
    on conflict do nothing;
  end if;
end $$;

-- Remplace les intérêts de l'utilisateur
create or replace function public.set_interests(p_interest_ids integer[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_user();
begin
  delete from public.user_interests where user_id = uid and category_id <> all (p_interest_ids);
  insert into public.user_interests (user_id, category_id)
  select uid, c.id from public.categories c where c.id = any (p_interest_ids)
  on conflict do nothing;
end $$;

-- Score de fiabilité : % de présence sur les sessions passées pointées par l'organisateur.
-- null tant qu'il y a moins de 3 sessions pointées (pas assez d'historique pour juger).
create or replace function public.reliability_score(p_user_id uuid)
returns smallint
language sql
stable
security definer
set search_path = ''
as $$
  select case when count(*) >= 3
    then round(100.0 * count(*) filter (where sp.status = 'attended') / count(*))::smallint
  end
  from public.session_participants sp
  where sp.user_id = p_user_id and sp.status in ('attended', 'no_show')
$$;

-- Suppression de compte (Loi 25) : annule ses sessions à venir, supprime l'utilisateur.
-- Les messages restent, détachés (« Compte supprimé ») ; avis, inscriptions et intérêts sont supprimés.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_user();
  s record;
begin
  for s in
    select id from public.sessions
    where host_id = uid and status = 'published' and starts_at > now()
  loop
    perform public.cancel_session_internal(s.id, null);
  end loop;
  delete from auth.users where id = uid;
end $$;

-- Compteurs dénormalisés --------------------------------------------------------

create or replace function public.refresh_session_counts(p_session_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.sessions s
  set places_taken = coalesce(c.taken, 0),
      waitlist_count = coalesce(c.waiting, 0)
  from (
    select
      sum(1 + guest_count) filter (where status in ('joined', 'attended', 'no_show'))::smallint as taken,
      count(*) filter (where status = 'waitlist')::smallint as waiting
    from public.session_participants
    where session_id = p_session_id
  ) c
  where s.id = p_session_id
$$;

create or replace function public.on_participants_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_session_counts(coalesce(new.session_id, old.session_id));
  return null;
end $$;

create trigger session_participants_counts
  after insert or update or delete on public.session_participants
  for each row execute function public.on_participants_change();

-- Liste d'attente --------------------------------------------------------------

-- Promeut la liste d'attente tant qu'il reste de la place. Appelant : doit tenir le verrou de la session.
create or replace function public.promote_waitlist(p_session_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.sessions;
  taken integer;
  w record;
  promoted integer := 0;
begin
  select * into s from public.sessions where id = p_session_id;
  if s.status <> 'published' or s.starts_at <= now() then
    return 0;
  end if;

  select coalesce(sum(1 + guest_count), 0) into taken
  from public.session_participants
  where session_id = p_session_id and status = 'joined';

  for w in
    select user_id, guest_count from public.session_participants
    where session_id = p_session_id and status = 'waitlist'
    order by joined_at, user_id
  loop
    if taken + 1 + w.guest_count > s.max_players then
      -- Un +1 qui ne rentre pas laisse passer la personne seule suivante
      continue;
    end if;
    update public.session_participants
    set status = 'joined'
    where session_id = p_session_id and user_id = w.user_id;
    taken := taken + 1 + w.guest_count;
    promoted := promoted + 1;
    if w.user_id is distinct from auth.uid() then
      insert into public.notifications (user_id, kind, session_id, payload)
      values (w.user_id, 'spot_opened', p_session_id, jsonb_build_object('title', s.title, 'starts_at', s.starts_at));
    end if;
  end loop;
  return promoted;
end $$;

-- Rejoindre / quitter ----------------------------------------------------------

-- Rejoindre une session. Verrou de ligne sur la session : deux personnes qui prennent la dernière
-- place en même temps sont sérialisées ; la seconde passe automatiquement en liste d'attente.
create or replace function public.join_session(p_session_id uuid, p_bring_guest boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_ready_user();
  s public.sessions;
  existing public.session_participants;
  taken integer;
  guests smallint := case when p_bring_guest then 1 else 0 end;
  new_status public.participant_status;
  pos integer;
begin
  select * into s from public.sessions where id = p_session_id for update;
  if not found or not public.can_view_session(p_session_id, uid) then
    raise exception 'session_unavailable' using errcode = 'P0001';
  end if;
  if s.status <> 'published' then
    raise exception 'session_unavailable' using errcode = 'P0001';
  end if;
  if s.starts_at <= now() then
    raise exception 'session_started' using errcode = 'P0001';
  end if;
  if s.host_id is not null and public.is_blocked_between(uid, s.host_id) then
    raise exception 'blocked' using errcode = 'P0001';
  end if;

  select * into existing from public.session_participants where session_id = p_session_id and user_id = uid;
  if existing.status in ('joined', 'waitlist') then
    -- Idempotent : un double tap ne crée rien de plus
    return jsonb_build_object(
      'status', existing.status,
      'position', case when existing.status = 'waitlist' then (
        select count(*) from public.session_participants
        where session_id = p_session_id and status = 'waitlist'
          and (joined_at, user_id) <= (existing.joined_at, existing.user_id)
      ) end,
      'places_taken', s.places_taken
    );
  end if;

  select coalesce(sum(1 + guest_count), 0) into taken
  from public.session_participants
  where session_id = p_session_id and status = 'joined';

  -- Place libre et personne en attente : on entre directement.
  -- S'il y a déjà une file, on s'y ajoute puis on laisse promote_waitlist appliquer l'ordre d'arrivée
  -- (un +1 qui ne rentre pas n'empêche pas une personne seule de passer).
  if taken + 1 + guests <= s.max_players
     and not exists (select 1 from public.session_participants where session_id = p_session_id and status = 'waitlist') then
    new_status := 'joined';
  else
    new_status := 'waitlist';
  end if;

  -- clock_timestamp() (et non now()) : l'ordre d'arrivée reste strict même dans une même transaction
  insert into public.session_participants (session_id, user_id, status, guest_count, joined_at)
  values (p_session_id, uid, new_status, guests, clock_timestamp())
  on conflict (session_id, user_id) do update
    set status = excluded.status, guest_count = excluded.guest_count, joined_at = excluded.joined_at;

  if new_status = 'waitlist' and taken < s.max_players then
    perform public.promote_waitlist(p_session_id);
    select status into new_status from public.session_participants where session_id = p_session_id and user_id = uid;
  end if;

  if new_status = 'waitlist' then
    select count(*) into pos
    from public.session_participants w, public.session_participants me
    where me.session_id = p_session_id and me.user_id = uid
      and w.session_id = p_session_id and w.status = 'waitlist'
      and (w.joined_at, w.user_id) <= (me.joined_at, me.user_id);
  end if;

  return jsonb_build_object(
    'status', new_status,
    'position', pos,
    'places_taken', (select places_taken from public.sessions where id = p_session_id)
  );
end $$;

-- Se désister (ou quitter la liste d'attente). Libère la place et promeut la liste d'attente.
create or replace function public.leave_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_user();
  s public.sessions;
  prev public.participant_status;
begin
  select * into s from public.sessions where id = p_session_id for update;
  if not found then
    raise exception 'session_unavailable' using errcode = 'P0001';
  end if;
  if s.host_id = uid then
    raise exception 'host_cannot_leave' using errcode = 'P0001';
  end if;
  if s.starts_at <= now() then
    raise exception 'session_started' using errcode = 'P0001';
  end if;

  select status into prev from public.session_participants where session_id = p_session_id and user_id = uid;
  if prev in ('joined', 'waitlist') then
    update public.session_participants
    set status = 'cancelled', guest_count = 0
    where session_id = p_session_id and user_id = uid;
  end if;

  if prev = 'joined' then
    perform public.promote_waitlist(p_session_id);
  end if;

  return jsonb_build_object('status', 'cancelled', 'places_taken', (select places_taken from public.sessions where id = p_session_id));
end $$;

-- Rejoindre toutes les occurrences à venir d'une série
create or replace function public.join_series(p_series_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  n integer := 0;
begin
  perform public.require_ready_user();
  for s in
    select id from public.sessions
    where series_id = p_series_id and status = 'published' and starts_at > now()
    order by starts_at
  loop
    perform public.join_session(s.id);
    n := n + 1;
  end loop;
  return n;
end $$;

-- Création, duplication, annulation --------------------------------------------

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
    and f.follower_id <> uid;

  return first_id;
end $$;

-- Annulation (interne : pas de contrôle d'auteur)
create or replace function public.cancel_session_internal(p_session_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.sessions;
begin
  update public.sessions
  set status = 'cancelled', cancelled_reason = nullif(btrim(p_reason), '')
  where id = p_session_id and status = 'published'
  returning * into s;
  if s.id is null then
    return;
  end if;
  insert into public.notifications (user_id, kind, session_id, payload)
  select sp.user_id, 'session_cancelled', p_session_id, jsonb_build_object('title', s.title, 'reason', s.cancelled_reason)
  from public.session_participants sp
  where sp.session_id = p_session_id and sp.status in ('joined', 'waitlist') and sp.user_id is distinct from s.host_id;
  -- Un message système dans le chat garde la trace pour les inscrits
  if s.cancelled_reason is not null then
    insert into public.messages (session_id, user_id, body) values (p_session_id, s.host_id, s.cancelled_reason);
  end if;
end $$;

create or replace function public.cancel_session(p_session_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_user();
begin
  perform 1 from public.sessions where id = p_session_id and host_id = uid for update;
  if not found then
    raise exception 'not_host' using errcode = 'P0001';
  end if;
  perform public.cancel_session_internal(p_session_id, p_reason);
end $$;

-- « Refaire la même » : copie une session passée à une nouvelle date
create or replace function public.duplicate_session(p_session_id uuid, p_starts_at timestamptz)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_ready_user();
  s public.sessions;
begin
  select * into s from public.sessions where id = p_session_id and host_id = uid;
  if not found then
    raise exception 'not_host' using errcode = 'P0001';
  end if;
  return public.create_session(
    s.category_id, s.title, s.description, p_starts_at,
    (extract(epoch from (s.ends_at - s.starts_at)) / 60)::integer,
    s.venue_name, s.address,
    extensions.st_y(s.location::extensions.geometry), extensions.st_x(s.location::extensions.geometry),
    s.min_players, s.max_players, s.level, s.price_cents, s.cancellation_policy, s.cover_url, null, s.group_id
  );
end $$;

-- Le changement de capacité par l'organisateur peut libérer des places
create or replace function public.on_session_capacity_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.max_players > old.max_players then
    perform public.promote_waitlist(new.id);
  elsif new.max_players < new.places_taken then
    raise exception 'capacity_below_participants' using errcode = 'P0001';
  end if;
  return null;
end $$;

create trigger sessions_capacity_change
  after update of max_players on public.sessions
  for each row execute function public.on_session_capacity_change();

-- Après la session : présence et avis --------------------------------------------

-- L'organisateur coche les présents ; les autres inscrits passent en « absent ».
create or replace function public.record_attendance(p_session_id uuid, p_attended uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_user();
  s public.sessions;
begin
  select * into s from public.sessions where id = p_session_id for update;
  if not found or s.host_id is distinct from uid then
    raise exception 'not_host' using errcode = 'P0001';
  end if;
  if s.starts_at > now() then
    raise exception 'session_not_started' using errcode = 'P0001';
  end if;
  if s.status = 'cancelled' then
    raise exception 'session_unavailable' using errcode = 'P0001';
  end if;
  if s.starts_at < now() - interval '14 days' then
    raise exception 'too_late' using errcode = 'P0001';
  end if;

  update public.session_participants
  set status = case when user_id = any (p_attended) or user_id = uid then 'attended'::public.participant_status else 'no_show'::public.participant_status end
  where session_id = p_session_id and status in ('joined', 'attended', 'no_show');

  update public.sessions set status = 'completed' where id = p_session_id;

  insert into public.notifications (user_id, kind, session_id, payload)
  select sp.user_id, 'review_request', p_session_id, jsonb_build_object('title', s.title)
  from public.session_participants sp
  where sp.session_id = p_session_id and sp.status = 'attended'
  on conflict do nothing;
end $$;

-- Avis en un tap : [{ "reviewed_id": "...", "rating": 1, "tags": ["punctual"] }, …]
create or replace function public.submit_reviews(p_session_id uuid, p_reviews jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_user();
  s public.sessions;
  r jsonb;
  n integer := 0;
begin
  select * into s from public.sessions where id = p_session_id;
  if not found or s.starts_at > now() or s.status = 'cancelled' then
    raise exception 'session_unavailable' using errcode = 'P0001';
  end if;
  if s.starts_at < now() - interval '14 days' then
    raise exception 'too_late' using errcode = 'P0001';
  end if;
  -- Seuls les présents (ou l'organisateur) peuvent évaluer
  if not exists (
    select 1 from public.session_participants
    where session_id = p_session_id and user_id = uid and status = 'attended'
  ) and s.host_id is distinct from uid then
    raise exception 'not_attendee' using errcode = 'P0001';
  end if;

  for r in select * from jsonb_array_elements(p_reviews) loop
    -- On ne note que les présents et l'organisateur
    if not exists (
      select 1 from public.session_participants
      where session_id = p_session_id and user_id = (r ->> 'reviewed_id')::uuid and status = 'attended'
    ) and s.host_id is distinct from (r ->> 'reviewed_id')::uuid then
      continue;
    end if;
    insert into public.reviews (session_id, reviewer_id, reviewed_id, rating, tags)
    values (
      p_session_id, uid, (r ->> 'reviewed_id')::uuid, (r ->> 'rating')::smallint,
      coalesce(array(select jsonb_array_elements_text(r -> 'tags')), '{}')
    )
    on conflict (session_id, reviewer_id, reviewed_id) do update set rating = excluded.rating, tags = excluded.tags;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Groupes -----------------------------------------------------------------------

create or replace function public.on_group_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_id is not null then
    insert into public.group_members (group_id, user_id, role) values (new.id, new.owner_id, 'admin')
    on conflict do nothing;
  end if;
  return null;
end $$;

create trigger groups_add_owner
  after insert on public.groups
  for each row execute function public.on_group_created();

-- Rejoindre un groupe public, ou privé avec le code d'invitation
create or replace function public.join_group(p_group_id uuid default null, p_invite_code text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_ready_user();
  g public.groups;
begin
  if p_invite_code is not null then
    select * into g from public.groups where invite_code = p_invite_code;
  else
    select * into g from public.groups where id = p_group_id;
  end if;
  if not found then
    raise exception 'group_unavailable' using errcode = 'P0001';
  end if;
  if g.visibility = 'private' and p_invite_code is distinct from g.invite_code then
    raise exception 'group_private' using errcode = 'P0001';
  end if;
  if g.owner_id is not null and public.is_blocked_between(uid, g.owner_id) then
    raise exception 'blocked' using errcode = 'P0001';
  end if;
  insert into public.group_members (group_id, user_id) values (g.id, uid) on conflict do nothing;
  return g.id;
end $$;

create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_user();
begin
  if exists (select 1 from public.groups where id = p_group_id and owner_id = uid) then
    raise exception 'owner_cannot_leave' using errcode = 'P0001';
  end if;
  delete from public.group_members where group_id = p_group_id and user_id = uid;
end $$;

-- Messages : anti-spam ------------------------------------------------------------

create or replace function public.on_message_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
begin
  if auth.uid() is null then
    return new; -- messages système (annulation)
  end if;
  select count(*) into recent from public.messages
  where user_id = new.user_id and created_at > now() - interval '1 minute';
  if recent >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  new.body := btrim(new.body);
  return new;
end $$;

create trigger messages_rate_limit
  before insert on public.messages
  for each row execute function public.on_message_insert();

-- Suppression douce de son propre message (ou par l'organisateur / un admin : modération)
create or replace function public.delete_message(p_message_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_user();
  m public.messages;
begin
  select * into m from public.messages where id = p_message_id;
  if not found then
    return;
  end if;
  if m.user_id is distinct from uid
     and not (m.session_id is not null and exists (select 1 from public.sessions where id = m.session_id and host_id = uid))
     and not (m.group_id is not null and public.is_group_admin(m.group_id, uid)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.messages set deleted_at = now(), body = '·' where id = p_message_id;
end $$;
