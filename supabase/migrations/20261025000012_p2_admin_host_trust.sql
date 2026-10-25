-- P2 : back-office admin, tableau de bord organisateur, co-organisateurs et joueurs de confiance.

-- 1. Rôles ---------------------------------------------------------------------
alter table public.profiles add column is_admin boolean not null default false;   -- équipe Partants (modération)
alter table public.group_members add column trusted boolean not null default false; -- joueur de confiance du groupe
-- Co-organisateur = rôle 'admin' du groupe (plusieurs possibles, le propriétaire reste unique).

-- Fenêtre prioritaire : avant cette heure, seuls les joueurs de confiance du groupe peuvent s'inscrire.
alter table public.sessions add column priority_until timestamptz;
alter table public.sessions add constraint sessions_priority_group check (priority_until is null or group_id is not null);

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'spot_opened', 'session_cancelled', 'reminder_24h', 'reminder_2h', 'checkin', 'new_from_followed', 'review_request', 'priority_access'
));

-- Ni is_admin ni trusted ne sont modifiables directement (privilèges par colonne déjà restreints).

create or replace function public.is_platform_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select coalesce((select is_admin from public.profiles where id = p_user_id), false) $$;

-- Peut gérer la session : organisateur ou co-organisateur (admin) du groupe de la session
create or replace function public.can_manage_session(p_session_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sessions s
    where s.id = p_session_id
      and (s.host_id = p_user_id or (s.group_id is not null and public.is_group_admin(s.group_id, p_user_id)))
  )
$$;

-- 2. Co-organisateurs : appel, annulation, chat ----------------------------------
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
  if not found or not public.can_manage_session(p_session_id, uid) then
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
  set status = case when user_id = any (p_attended) or user_id = s.host_id then 'attended'::public.participant_status else 'no_show'::public.participant_status end
  where session_id = p_session_id and status in ('joined', 'attended', 'no_show');

  update public.sessions set status = 'completed' where id = p_session_id;

  insert into public.notifications (user_id, kind, session_id, payload)
  select sp.user_id, 'review_request', p_session_id, jsonb_build_object('title', s.title)
  from public.session_participants sp
  where sp.session_id = p_session_id and sp.status = 'attended'
  on conflict do nothing;
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
  perform 1 from public.sessions where id = p_session_id for update;
  if not found or not public.can_manage_session(p_session_id, uid) then
    raise exception 'not_host' using errcode = 'P0001';
  end if;
  perform public.cancel_session_internal(p_session_id, p_reason);
end $$;

create or replace function public.session_roster(p_session_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    public.person_json(sp.user_id) || jsonb_build_object(
      'status', sp.status,
      'guest_count', sp.guest_count,
      'is_host', sp.user_id = s.host_id,
      'my_review', (select jsonb_build_object('rating', r.rating, 'tags', r.tags) from public.reviews r
                    where r.session_id = s.id and r.reviewer_id = auth.uid() and r.reviewed_id = sp.user_id)
    ) order by (sp.user_id = s.host_id) desc, sp.joined_at
  ), '[]'::jsonb)
  from public.sessions s
  join public.session_participants sp on sp.session_id = s.id and sp.status in ('joined', 'attended', 'no_show')
  where s.id = p_session_id and (public.is_session_member(s.id, auth.uid()) or public.can_manage_session(s.id, auth.uid()))
$$;

-- Les co-organisateurs lisent et écrivent dans le chat des sessions du groupe
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
      or exists (
        select 1 from public.sessions s
        where s.id = p_session_id and s.group_id is not null and public.is_group_admin(s.group_id, p_user_id)
      )
$$;

-- Gestion des membres : rôles (co-organisateur) et confiance. Propriétaire ou co-organisateur seulement.
create or replace function public.set_group_member(p_group_id uuid, p_user_id uuid, p_role public.group_role default null, p_trusted boolean default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_user();
  g public.groups;
begin
  select * into g from public.groups where id = p_group_id;
  if not found or not public.is_group_admin(p_group_id, uid) then
    raise exception 'not_group_admin' using errcode = 'P0001';
  end if;
  -- Seul le propriétaire nomme ou retire des co-organisateurs ; personne ne rétrograde le propriétaire
  if p_role is not null and g.owner_id is distinct from uid then
    raise exception 'owner_only' using errcode = 'P0001';
  end if;
  if p_role = 'member' and p_user_id = g.owner_id then
    raise exception 'owner_only' using errcode = 'P0001';
  end if;
  update public.group_members
  set role = coalesce(p_role, role), trusted = coalesce(p_trusted, trusted)
  where group_id = p_group_id and user_id = p_user_id;
  if not found then
    raise exception 'not_member' using errcode = 'P0001';
  end if;
end $$;

-- Liste des membres (visible des membres du groupe)
create or replace function public.group_members_list(p_group_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    public.person_json(m.user_id) || jsonb_build_object(
      'role', m.role,
      'trusted', m.trusted,
      'is_owner', m.user_id = g.owner_id,
      'sessions_attended', (
        select count(*) from public.session_participants sp join public.sessions s on s.id = sp.session_id
        where sp.user_id = m.user_id and s.group_id = g.id and sp.status = 'attended'
      ),
      'reliability', public.reliability_score(m.user_id)
    ) order by (m.user_id = g.owner_id) desc, m.role, m.trusted desc, m.joined_at
  ), '[]'::jsonb)
  from public.groups g
  join public.group_members m on m.group_id = g.id
  where g.id = p_group_id and public.is_group_member(g.id, auth.uid())
$$;

-- 3. Joueurs de confiance : fenêtre prioritaire ----------------------------------
create or replace function public.check_priority_window()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.sessions;
begin
  if new.status not in ('joined', 'waitlist') or (tg_op = 'UPDATE' and old.status in ('joined', 'waitlist')) then
    return new;
  end if;
  select * into s from public.sessions where id = new.session_id;
  if s.priority_until is not null and now() < s.priority_until
     and new.user_id is distinct from s.host_id
     and not exists (
       select 1 from public.group_members m
       where m.group_id = s.group_id and m.user_id = new.user_id and (m.trusted or m.role = 'admin')
     ) then
    raise exception 'priority_window' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger session_participants_priority
  before insert or update of status on public.session_participants
  for each row execute function public.check_priority_window();

-- Ouvre une fenêtre prioritaire (en heures) sur une session de groupe et prévient les joueurs de confiance
create or replace function public.set_priority_window(p_session_id uuid, p_hours integer)
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
  if not found or s.group_id is null or not public.can_manage_session(p_session_id, uid) then
    raise exception 'not_host' using errcode = 'P0001';
  end if;
  if p_hours not between 0 and 72 then
    raise exception 'invalid_window' using errcode = 'P0001';
  end if;
  update public.sessions set priority_until = case when p_hours = 0 then null else least(now() + make_interval(hours => p_hours), s.starts_at) end
  where id = p_session_id;
  if p_hours > 0 then
    insert into public.notifications (user_id, kind, session_id, payload)
    select m.user_id, 'priority_access', s.id, jsonb_build_object('title', s.title, 'hours', p_hours)
    from public.group_members m
    where m.group_id = s.group_id and m.trusted and m.user_id is distinct from uid;
  end if;
end $$;

-- La carte de session expose la fenêtre et si j'y ai droit
create or replace function public.session_card_json(s public.sessions, p_lat double precision default null, p_lng double precision default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', s.id,
    'title', s.title,
    'description', s.description,
    'starts_at', s.starts_at,
    'ends_at', s.ends_at,
    'venue_name', s.venue_name,
    'address', s.address,
    'lat', extensions.st_y(s.location::extensions.geometry),
    'lng', extensions.st_x(s.location::extensions.geometry),
    'distance_m', case when p_lat is not null and p_lng is not null
      then round(extensions.st_distance(s.location, extensions.st_point(p_lng, p_lat, 4326)::extensions.geography)) end,
    'category', jsonb_build_object('id', c.id, 'slug', c.slug, 'name_fr', c.name_fr, 'name_en', c.name_en, 'icon', c.icon, 'tint', c.tint),
    'level', s.level,
    'price_cents', s.price_cents,
    'currency', s.currency,
    'min_players', s.min_players,
    'max_players', s.max_players,
    'joined_count', s.places_taken,
    'waitlist_count', s.waitlist_count,
    'cover_url', s.cover_url,
    'cover_blurhash', s.cover_blurhash,
    'status', s.status,
    'cancellation_policy', s.cancellation_policy,
    'host', public.host_json(s.host_id),
    'participants_preview', coalesce((
      select jsonb_agg(public.person_json(sp.user_id) order by (sp.user_id = s.host_id) desc, sp.joined_at)
      from (
        select user_id, joined_at from public.session_participants
        where session_id = s.id and status in ('joined', 'attended')
        order by (user_id = s.host_id) desc, joined_at
        limit 5
      ) sp
    ), '[]'::jsonb),
    'my_status', (select sp.status from public.session_participants sp where sp.session_id = s.id and sp.user_id = auth.uid()),
    'group', (select jsonb_build_object('id', g.id, 'name', g.name) from public.groups g where g.id = s.group_id),
    'series_id', s.series_id,
    'recurrence_rule', s.recurrence_rule,
    'priority_until', case when s.priority_until > now() then s.priority_until end,
    'i_have_priority', s.priority_until > now() and exists (
      select 1 from public.group_members m where m.group_id = s.group_id and m.user_id = auth.uid() and (m.trusted or m.role = 'admin')
    ),
    'can_manage', auth.uid() is not null and public.can_manage_session(s.id, auth.uid())
  )
  from public.categories c
  where c.id = s.category_id
$$;

-- 4. Tableau de bord organisateur --------------------------------------------------
create or replace function public.host_dashboard(p_days integer default 90)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select s.* from public.sessions s
    where s.host_id = auth.uid() and s.status in ('published', 'completed')
      and s.starts_at > now() - make_interval(days => least(greatest(p_days, 7), 365))
  ),
  past as (select * from mine where starts_at <= now()),
  att as (
    select sp.* from public.session_participants sp
    join past p on p.id = sp.session_id
    where sp.user_id <> auth.uid()
  )
  select jsonb_build_object(
    'days', p_days,
    'sessions_total', (select count(*) from mine),
    'sessions_upcoming', (select count(*) from mine where starts_at > now()),
    'fill_rate', (select round(100.0 * avg(least(places_taken, max_players)::numeric / max_players)) from past),
    'attendance_rate', (
      select round(100.0 * count(*) filter (where status = 'attended') / nullif(count(*) filter (where status in ('attended', 'no_show')), 0)) from att
    ),
    'unique_players', (select count(distinct user_id) from att where status in ('attended', 'joined', 'no_show')),
    'thumbs_up', (select count(*) from public.reviews r join past p on p.id = r.session_id where r.reviewed_id = auth.uid() and r.rating = 1),
    'weekly', coalesce((
      select jsonb_agg(w order by w.week)
      from (
        select date_trunc('week', starts_at at time zone 'America/Toronto')::date as week,
               count(*) as sessions,
               -- Remplissage : sessions passées seulement (une session à venir n'est pas encore pleine)
               round(100.0 * avg(least(places_taken, max_players)::numeric / max_players) filter (where starts_at <= now())) as fill
        from mine group by 1
      ) w
    ), '[]'::jsonb),
    'regulars', coalesce((
      select jsonb_agg(public.person_json(r.user_id) || jsonb_build_object('count', r.n) order by r.n desc)
      from (
        select user_id, count(*) as n from att where status = 'attended'
        group by user_id having count(*) >= 2 order by count(*) desc limit 10
      ) r
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'title', p.title, 'starts_at', p.starts_at, 'status', p.status,
        'places_taken', p.places_taken, 'max_players', p.max_players,
        'attended', (select count(*) from att where att.session_id = p.id and att.status = 'attended'),
        'no_show', (select count(*) from att where att.session_id = p.id and att.status = 'no_show')
      ) order by p.starts_at desc)
      from (select * from past order by starts_at desc limit 8) p
    ), '[]'::jsonb)
  )
$$;

-- 5. Back-office admin ---------------------------------------------------------------
create or replace function public.require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_user();
begin
  if not public.is_platform_admin(uid) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return uid;
end $$;

create or replace function public.admin_list_reports(p_status public.report_status default 'open', p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id,
      'target_type', r.target_type,
      'target_id', r.target_id,
      'reason', r.reason,
      'details', r.details,
      'status', r.status,
      'created_at', r.created_at,
      'reporter', public.person_json(r.reporter_id),
      'reports_on_target', (select count(*) from public.reports x where x.target_type = r.target_type and x.target_id = r.target_id),
      'target', case r.target_type
        when 'user' then (select public.person_json(p.id) || jsonb_build_object('is_banned', p.is_banned) from public.profiles p where p.id::text = r.target_id)
        when 'session' then (select jsonb_build_object('title', s.title, 'status', s.status, 'starts_at', s.starts_at, 'host', public.person_json(s.host_id)) from public.sessions s where s.id::text = r.target_id)
        when 'group' then (select jsonb_build_object('name', g.name, 'visibility', g.visibility, 'owner', public.person_json(g.owner_id)) from public.groups g where g.id::text = r.target_id)
        when 'message' then (select jsonb_build_object('body', m.body, 'deleted', m.deleted_at is not null, 'author', public.person_json(m.user_id)) from public.messages m where m.id::text = r.target_id)
      end
    ) order by r.created_at desc)
    from (select * from public.reports where status = p_status order by created_at desc limit least(p_limit, 200)) r
  ), '[]'::jsonb);
end $$;

-- Traite un signalement : action éventuelle + statut
create or replace function public.admin_resolve_report(p_report_id bigint, p_action text, p_status public.report_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.reports;
  target_user uuid;
begin
  perform public.require_admin();
  select * into r from public.reports where id = p_report_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  case p_action
    when 'none' then null;
    when 'ban_user' then
      target_user := case r.target_type
        when 'user' then r.target_id::uuid
        when 'session' then (select host_id from public.sessions where id::text = r.target_id)
        when 'group' then (select owner_id from public.groups where id::text = r.target_id)
        when 'message' then (select user_id from public.messages where id::text = r.target_id)
      end;
      update public.profiles set is_banned = true where id = target_user;
      -- Ses sessions à venir sont annulées
      perform public.cancel_session_internal(s.id, null) from public.sessions s
      where s.host_id = target_user and s.status = 'published' and s.starts_at > now();
    when 'cancel_session' then
      if r.target_type <> 'session' then raise exception 'invalid_action' using errcode = 'P0001'; end if;
      perform public.cancel_session_internal(r.target_id::uuid, null);
    when 'delete_message' then
      if r.target_type <> 'message' then raise exception 'invalid_action' using errcode = 'P0001'; end if;
      update public.messages set deleted_at = now(), body = '·' where id::text = r.target_id;
    when 'hide_group' then
      if r.target_type <> 'group' then raise exception 'invalid_action' using errcode = 'P0001'; end if;
      update public.groups set visibility = 'private' where id::text = r.target_id;
    else
      raise exception 'invalid_action' using errcode = 'P0001';
  end case;
  -- Tous les signalements sur la même cible sont clos ensemble
  update public.reports set status = p_status
  where target_type = r.target_type and target_id = r.target_id and status = 'open';
end $$;

create or replace function public.admin_unban(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  update public.profiles set is_banned = false where id = p_user_id;
end $$;

-- Stats par ville (s'appuie sur les vues de la migration 011)
create or replace function public.admin_city_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'weekly', coalesce((select jsonb_agg(to_jsonb(w) || jsonb_build_object('city', c.name) order by w.week desc)
                        from (select * from metrics.weekly limit 24) w join public.cities c on c.id = w.city_id), '[]'::jsonb),
    'cohorts', coalesce((select jsonb_agg(to_jsonb(k) order by k.cohort desc) from (select * from metrics.cohorts limit 12) k), '[]'::jsonb),
    'totals', jsonb_build_object(
      'users', (select count(*) from public.profiles where terms_accepted_at is not null),
      'banned', (select count(*) from public.profiles where is_banned),
      'groups', (select count(*) from public.groups),
      'open_reports', (select count(*) from public.reports where status = 'open'),
      'sessions_upcoming', (select count(*) from public.sessions where status = 'published' and starts_at > now())
    )
  );
end $$;

-- get_me expose is_admin pour afficher l'accès au back-office
create or replace function public.get_me()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_profile(p.id) || jsonb_build_object(
    'locale', p.locale,
    'city_id', p.city_id,
    'profile_complete', p.adult_confirmed_at is not null and p.terms_accepted_at is not null and p.display_name <> '',
    'terms_version', p.terms_version,
    'interest_ids', coalesce((select jsonb_agg(category_id) from public.user_interests where user_id = p.id), '[]'::jsonb),
    'unread_notifications', (select count(*) from public.notifications n where n.user_id = p.id and n.read_at is null),
    'is_admin', p.is_admin
  )
  from public.profiles p where p.id = auth.uid()
$$;

-- Privilèges --------------------------------------------------------------------------
revoke execute on function
  public.is_platform_admin(uuid), public.can_manage_session(uuid, uuid), public.set_group_member(uuid, uuid, public.group_role, boolean),
  public.group_members_list(uuid), public.check_priority_window(), public.set_priority_window(uuid, integer), public.host_dashboard(integer),
  public.require_admin(), public.admin_list_reports(public.report_status, integer), public.admin_resolve_report(bigint, text, public.report_status),
  public.admin_unban(uuid), public.admin_city_stats()
from public, anon;

grant execute on function
  public.set_group_member(uuid, uuid, public.group_role, boolean), public.group_members_list(uuid),
  public.set_priority_window(uuid, integer), public.host_dashboard(integer),
  public.admin_list_reports(public.report_status, integer), public.admin_resolve_report(bigint, text, public.report_status),
  public.admin_unban(uuid), public.admin_city_stats(), public.can_manage_session(uuid, uuid)
to authenticated;

grant usage on schema metrics to postgres;
