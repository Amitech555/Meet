-- Partants — API de lecture (RPC). Une requête = un écran, JSON prêt à afficher.
-- Fonctions SECURITY DEFINER qui appliquent elles-mêmes les règles de visibilité
-- (sessions publiées, groupes privés, blocages) et n'exposent que des champs publics.

-- Profil public minimal (Loi 25 : prénom, avatar, fiabilité — rien d'autre)
create or replace function public.person_json(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('id', p.id, 'display_name', p.display_name, 'avatar_url', p.avatar_url)
  from public.profiles p where p.id = p_user_id
$$;

create or replace function public.host_json(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'display_name', p.display_name,
    'avatar_url', p.avatar_url,
    'reliability', public.reliability_score(p.id),
    'sessions_hosted', (select count(*) from public.sessions s where s.host_id = p.id and s.status in ('published', 'completed')),
    'verified', p.phone_verified_at is not null
  )
  from public.profiles p where p.id = p_user_id
$$;

-- Carte de session (forme SessionSummary côté app)
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
    'recurrence_rule', s.recurrence_rule
  )
  from public.categories c
  where c.id = s.category_id
$$;

-- Fil Découvrir : filtres, rayon PostGIS, recherche texte, pagination par curseur (starts_at, id)
create or replace function public.feed_sessions(
  p_city_id smallint,
  p_lat double precision default null,
  p_lng double precision default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_category_ids integer[] default null,
  p_price text default 'all',           -- all | free | paid
  p_levels public.session_level[] default null,
  p_radius_m integer default null,
  p_query text default null,
  p_limit integer default 20,
  p_cursor_starts_at timestamptz default null,
  p_cursor_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with params as (
    select
      case when p_lat is not null and p_lng is not null
        then extensions.st_point(p_lng, p_lat, 4326)::extensions.geography end as here,
      nullif(public.f_unaccent(lower(btrim(coalesce(p_query, '')))), '') as q,
      auth.uid() as uid
  ),
  cats as (
    -- Une catégorie parente inclut ses enfants (Sport collectif → basket, soccer…)
    select id from public.categories
    where p_category_ids is not null and (id = any (p_category_ids) or parent_id = any (p_category_ids))
  ),
  rows as (
    select s.*
    from public.sessions s, params
    where s.city_id = p_city_id
      and s.status = 'published'
      and s.starts_at > now()
      and s.starts_at >= coalesce(p_from, now())
      and (p_to is null or s.starts_at <= p_to)
      and (p_category_ids is null or s.category_id in (select id from cats))
      and (p_price = 'all' or (p_price = 'free' and s.price_cents = 0) or (p_price = 'paid' and s.price_cents > 0))
      and (p_levels is null or s.level = any (p_levels) or s.level = 'all')
      and (p_radius_m is null or params.here is null or extensions.st_dwithin(s.location, params.here, p_radius_m))
      and (params.q is null
        or s.search_text like '%' || params.q || '%'
        or exists (select 1 from public.profiles hp where hp.id = s.host_id and public.f_unaccent(lower(hp.display_name)) like params.q || '%')
        or exists (select 1 from public.categories cc where cc.id = s.category_id and (public.f_unaccent(lower(cc.name_fr)) like '%' || params.q || '%' or lower(cc.name_en) like '%' || params.q || '%')))
      and (s.group_id is null or exists (
        select 1 from public.groups g where g.id = s.group_id and (g.visibility = 'public' or public.is_group_member(g.id, params.uid))
      ))
      and (params.uid is null or s.host_id is null or not public.is_blocked_between(params.uid, s.host_id))
      and (p_cursor_starts_at is null or (s.starts_at, s.id) > (p_cursor_starts_at, p_cursor_id))
    order by s.starts_at, s.id
    limit least(greatest(p_limit, 1), 50)
  )
  select coalesce(jsonb_agg(public.session_card_json(r, p_lat, p_lng) order by r.starts_at, r.id), '[]'::jsonb)
  from rows r
$$;

-- Recherche par rayon (PostGIS), triée par distance
create or replace function public.sessions_within_radius(p_lat double precision, p_lng double precision, p_radius_m integer default 5000, p_limit integer default 50)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with here as (select extensions.st_point(p_lng, p_lat, 4326)::extensions.geography as g),
  rows as (
    select s.* from public.sessions s, here
    where s.status = 'published' and s.starts_at > now()
      and extensions.st_dwithin(s.location, here.g, least(p_radius_m, 50000))
      and public.can_view_session(s.id, auth.uid())
      and (auth.uid() is null or s.host_id is null or not public.is_blocked_between(auth.uid(), s.host_id))
    order by s.location operator(extensions.<->) here.g
    limit least(p_limit, 100)
  )
  select coalesce(jsonb_agg(public.session_card_json(r, p_lat, p_lng)), '[]'::jsonb) from rows r
$$;

-- Détail d'une session : carte + participants + aperçu du chat (si membre) + ma position d'attente
create or replace function public.get_session(p_session_id uuid, p_lat double precision default null, p_lng double precision default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.sessions;
  uid uuid := auth.uid();
  card jsonb;
  member boolean;
begin
  select * into s from public.sessions where id = p_session_id;
  if not found or not public.can_view_session(p_session_id, uid) then
    return null;
  end if;
  member := uid is not null and public.is_session_member(p_session_id, uid);
  card := public.session_card_json(s, p_lat, p_lng);
  return card || jsonb_build_object(
    'participants', coalesce((
      select jsonb_agg(public.person_json(sp.user_id) || jsonb_build_object('guest_count', sp.guest_count, 'is_host', sp.user_id = s.host_id)
                       order by (sp.user_id = s.host_id) desc, sp.joined_at)
      from public.session_participants sp
      where sp.session_id = s.id and sp.status in ('joined', 'attended')
    ), '[]'::jsonb),
    'my_waitlist_position', (
      select count(*) from public.session_participants w, public.session_participants me
      where me.session_id = s.id and me.user_id = uid and me.status = 'waitlist'
        and w.session_id = s.id and w.status = 'waitlist' and (w.joined_at, w.user_id) <= (me.joined_at, me.user_id)
    ),
    'my_guest_count', (select guest_count from public.session_participants where session_id = s.id and user_id = uid),
    'is_member', member,
    'is_saved', exists (select 1 from public.saved_sessions where user_id = uid and session_id = s.id),
    'cancelled_reason', s.cancelled_reason,
    'chat_preview', case when member then coalesce((
      select jsonb_agg(m order by m.created_at) from (
        select id, body, created_at, user_id, public.person_json(user_id) as author
        from public.messages
        where session_id = s.id and deleted_at is null
        order by created_at desc
        limit 3
      ) m
    ), '[]'::jsonb) end,
    'message_count', case when member then (select count(*) from public.messages where session_id = s.id and deleted_at is null) end
  );
end $$;

-- Mes sessions : upcoming | past | hosting
create or replace function public.my_sessions(p_kind text, p_limit integer default 50)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with rows as (
    select s.*
    from public.sessions s
    where auth.uid() is not null
      and case p_kind
        when 'hosting' then s.host_id = auth.uid() and s.starts_at > now() - interval '1 day' and s.status <> 'draft'
        when 'upcoming' then s.ends_at > now() and s.status in ('published', 'cancelled')
          and exists (select 1 from public.session_participants sp where sp.session_id = s.id and sp.user_id = auth.uid() and sp.status in ('joined', 'waitlist'))
        when 'past' then s.ends_at <= now() and s.status <> 'cancelled'
          and exists (select 1 from public.session_participants sp where sp.session_id = s.id and sp.user_id = auth.uid() and sp.status in ('joined', 'attended', 'no_show'))
        else false
      end
    order by case when p_kind = 'past' then extract(epoch from s.starts_at) * -1 else extract(epoch from s.starts_at) end
    limit least(p_limit, 100)
  )
  select coalesce(jsonb_agg(
    public.session_card_json(r) || jsonb_build_object(
      'needs_checkin', r.host_id = auth.uid() and r.starts_at <= now() and r.status = 'published',
      'needs_review', p_kind = 'past' and r.starts_at > now() - interval '14 days'
        and not exists (select 1 from public.reviews rv where rv.session_id = r.id and rv.reviewer_id = auth.uid())
        and exists (select 1 from public.session_participants sp where sp.session_id = r.id and sp.user_id = auth.uid() and sp.status = 'attended')
    )
    order by case when p_kind = 'past' then extract(epoch from r.starts_at) * -1 else extract(epoch from r.starts_at) end
  ), '[]'::jsonb)
  from rows r
$$;

-- Profil public : stats simples, avis agrégés en tags (anonymes), activités, sessions à venir organisées
create or replace function public.get_profile(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'display_name', p.display_name,
    'avatar_url', p.avatar_url,
    'bio', p.bio,
    'city', (select jsonb_build_object('id', c.id, 'name', c.name) from public.cities c where c.id = p.city_id),
    'member_since', p.created_at,
    'verified', p.phone_verified_at is not null,
    'reliability', public.reliability_score(p.id),
    'sessions_played', (select count(*) from public.session_participants sp where sp.user_id = p.id and sp.status = 'attended'),
    'sessions_hosted', (select count(*) from public.sessions s where s.host_id = p.id and s.status in ('published', 'completed')),
    'thumbs_up', (select count(*) from public.reviews r where r.reviewed_id = p.id and r.rating = 1),
    'review_count', (select count(*) from public.reviews r where r.reviewed_id = p.id),
    'tags', coalesce((
      select jsonb_agg(jsonb_build_object('tag', t.tag, 'count', t.n) order by t.n desc)
      from (
        select tag, count(*) as n from public.reviews r, unnest(r.tags) as tag
        where r.reviewed_id = p.id and r.rating = 1
        group by tag
      ) t
    ), '[]'::jsonb),
    'interests', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'slug', c.slug, 'name_fr', c.name_fr, 'name_en', c.name_en, 'icon', c.icon, 'tint', c.tint, 'level', ui.level) order by c.sort)
      from public.user_interests ui join public.categories c on c.id = ui.category_id
      where ui.user_id = p.id
    ), '[]'::jsonb),
    'upcoming_hosted', coalesce((
      select jsonb_agg(public.session_card_json(s) order by s.starts_at)
      from (
        select * from public.sessions s
        where s.host_id = p.id and s.status = 'published' and s.starts_at > now()
          and public.can_view_session(s.id, auth.uid())
        order by s.starts_at limit 5
      ) s
    ), '[]'::jsonb),
    'is_me', p.id = auth.uid(),
    'is_blocked', exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = p.id),
    'is_following', exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.host_id = p.id)
  )
  from public.profiles p
  where p.id = p_user_id
    and (auth.uid() is null or p.id = auth.uid() or not exists (
      select 1 from public.blocks b where b.blocker_id = p.id and b.blocked_id = auth.uid()
    ))
$$;

-- Mon profil privé (réglages + état d'inscription)
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
    'unread_notifications', (select count(*) from public.notifications n where n.user_id = p.id and n.read_at is null)
  )
  from public.profiles p where p.id = auth.uid()
$$;

-- Personnes à évaluer / pointer après une session
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
  where s.id = p_session_id and public.is_session_member(s.id, auth.uid())
$$;

-- Groupes : liste (mes groupes / à découvrir) avec la prochaine session
create or replace function public.group_card_json(g public.groups)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', g.id,
    'name', g.name,
    'description', g.description,
    'cover_url', g.cover_url,
    'rhythm_label', g.rhythm_label,
    'visibility', g.visibility,
    'category', (select jsonb_build_object('id', c.id, 'slug', c.slug, 'name_fr', c.name_fr, 'name_en', c.name_en, 'icon', c.icon, 'tint', c.tint) from public.categories c where c.id = g.category_id),
    'member_count', (select count(*) from public.group_members m where m.group_id = g.id),
    'members_preview', coalesce((
      select jsonb_agg(public.person_json(m.user_id)) from (
        select user_id from public.group_members where group_id = g.id order by role, joined_at limit 4
      ) m
    ), '[]'::jsonb),
    'my_role', (select m.role from public.group_members m where m.group_id = g.id and m.user_id = auth.uid()),
    'next_session', (
      select public.session_card_json(s) from public.sessions s
      where s.group_id = g.id and s.status = 'published' and s.starts_at > now()
      order by s.starts_at limit 1
    )
  )
$$;

create or replace function public.list_groups(p_city_id smallint, p_scope text default 'discover')
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.group_card_json(g) order by g.created_at desc), '[]'::jsonb)
  from public.groups g
  where case p_scope
    when 'mine' then public.is_group_member(g.id, auth.uid())
    else g.city_id = p_city_id and g.visibility = 'public'
      and (auth.uid() is null or not public.is_group_member(g.id, auth.uid()))
  end
  and (auth.uid() is null or g.owner_id is null or not public.is_blocked_between(auth.uid(), g.owner_id))
$$;

create or replace function public.get_group(p_group_id uuid default null, p_invite_code text default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.group_card_json(g) || jsonb_build_object(
    'invite_code', case when public.is_group_member(g.id, auth.uid()) then g.invite_code end,
    'upcoming', case when g.visibility = 'public' or public.is_group_member(g.id, auth.uid()) or p_invite_code = g.invite_code then coalesce((
      select jsonb_agg(public.session_card_json(s) order by s.starts_at)
      from (select * from public.sessions s where s.group_id = g.id and s.status = 'published' and s.starts_at > now() order by s.starts_at limit 12) s
    ), '[]'::jsonb) else '[]'::jsonb end,
    'locked', g.visibility = 'private' and not public.is_group_member(g.id, auth.uid()) and p_invite_code is distinct from g.invite_code,
    'is_following', exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.group_id = g.id)
  )
  from public.groups g
  where (p_invite_code is not null and g.invite_code = p_invite_code) or (p_invite_code is null and g.id = p_group_id)
$$;

-- Messages d'un fil (session ou groupe), avec auteur — lecture paginée
create or replace function public.list_messages(p_session_id uuid default null, p_group_id uuid default null, p_before bigint default null, p_limit integer default 40)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(m order by m.id), '[]'::jsonb)
  from (
    select msg.id, msg.body, msg.created_at, msg.user_id, msg.deleted_at is not null as deleted,
           public.person_json(msg.user_id) as author
    from public.messages msg
    where (
        (p_session_id is not null and msg.session_id = p_session_id and public.is_session_member(p_session_id, auth.uid()))
        or (p_group_id is not null and msg.group_id = p_group_id and public.is_group_member(p_group_id, auth.uid()))
      )
      and (p_before is null or msg.id < p_before)
      and (msg.user_id is null or not exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = msg.user_id))
    order by msg.id desc
    limit least(p_limit, 100)
  ) m
$$;

-- Sessions passées que je peux « refaire » (organisées par moi)
create or replace function public.my_past_hosted(p_limit integer default 10)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.session_card_json(s) order by s.starts_at desc), '[]'::jsonb)
  from (
    select * from (
      select distinct on (coalesce(series_id, id)) *
      from public.sessions
      where host_id = auth.uid() and starts_at < now() and status in ('completed', 'published')
      order by coalesce(series_id, id), starts_at desc
    ) latest
    order by starts_at desc
    limit least(p_limit, 30)
  ) s
$$;
