-- Partants — tables principales. Toutes les dates sont en UTC (timestamptz).

-- Villes ---------------------------------------------------------------------
create table public.cities (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  region text not null,
  country text not null default 'CA',
  location extensions.geography(point, 4326) not null,
  timezone text not null default 'America/Toronto',
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

-- Catégories (extensibles, pas en dur) ---------------------------------------
create table public.categories (
  id integer generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_fr text not null,
  name_en text not null,
  icon text not null default 'other',  -- clé du registre d'icônes de l'app
  tint text not null default 'sable',  -- clé de design/tokens.ts > categoryTints
  parent_id integer references public.categories (id) on delete set null,
  sort smallint not null default 100,
  is_active boolean not null default true
);
create index categories_parent_idx on public.categories (parent_id);

-- Profils --------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  avatar_url text check (avatar_url is null or avatar_url ~ '^https?://'),
  bio text check (char_length(bio) <= 160),
  city_id smallint references public.cities (id),
  locale text not null default 'fr' check (locale in ('fr', 'en')),
  -- 18+ vérifié côté serveur ; la date de naissance n'est PAS conservée (Loi 25)
  adult_confirmed_at timestamptz,
  terms_accepted_at timestamptz,
  terms_version text,
  phone_verified_at timestamptz,
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_interests (
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id integer not null references public.categories (id) on delete cascade,
  level public.session_level not null default 'all',
  primary key (user_id, category_id)
);

-- Groupes récurrents ---------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete set null,
  name text not null check (char_length(name) between 3 and 60),
  description text check (char_length(description) <= 500),
  category_id integer not null references public.categories (id),
  city_id smallint not null references public.cities (id),
  cover_url text,
  rhythm_label text check (char_length(rhythm_label) <= 60), -- « Tous les mardis 6 h 30 »
  visibility public.group_visibility not null default 'public',
  invite_code text not null unique default encode(extensions.gen_random_bytes(6), 'hex'),
  created_at timestamptz not null default now()
);
create index groups_city_idx on public.groups (city_id, visibility);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.group_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

-- Sessions -------------------------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references public.profiles (id) on delete set null,
  group_id uuid references public.groups (id) on delete set null,
  category_id integer not null references public.categories (id),
  title text not null check (char_length(title) between 4 and 80),
  description text check (char_length(description) <= 1000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue_name text not null check (char_length(venue_name) between 2 and 80),
  address text check (char_length(address) <= 200),
  location extensions.geography(point, 4326) not null,
  city_id smallint not null references public.cities (id),
  min_players smallint not null default 2 check (min_players >= 1),
  max_players smallint not null check (max_players between 2 and 100),
  level public.session_level not null default 'all',
  price_cents integer not null default 0 check (price_cents between 0 and 50000),
  currency char(3) not null default 'CAD',
  cancellation_policy public.cancellation_policy not null default 'flexible',
  cover_url text,
  cover_blurhash text,
  status public.session_status not null default 'published',
  recurrence_rule text check (recurrence_rule is null or recurrence_rule in ('FREQ=WEEKLY', 'FREQ=WEEKLY;INTERVAL=2')),
  series_id uuid,
  cancelled_reason text check (char_length(cancelled_reason) <= 300),
  -- Compteurs dénormalisés, tenus à jour par trigger (lecture anonyme + Realtime sans exposer les participants)
  places_taken smallint not null default 0,
  waitlist_count smallint not null default 0,
  search_text text generated always as (
    public.f_unaccent(lower(title || ' ' || venue_name || ' ' || coalesce(address, '')))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sessions_time_order check (ends_at > starts_at),
  constraint sessions_duration check (ends_at - starts_at <= interval '24 hours'),
  constraint sessions_players_order check (max_players >= min_players)
);
create index sessions_feed_idx on public.sessions (city_id, status, starts_at);
create index sessions_location_idx on public.sessions using gist (location);
create index sessions_host_idx on public.sessions (host_id, starts_at desc);
create index sessions_group_idx on public.sessions (group_id, starts_at);
create index sessions_series_idx on public.sessions (series_id) where series_id is not null;
create index sessions_search_idx on public.sessions using gin (search_text extensions.gin_trgm_ops);

create table public.session_participants (
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.participant_status not null,
  payment_status public.payment_status not null default 'none',
  guest_count smallint not null default 0 check (guest_count between 0 and 1), -- « amener un invité » (+1)
  joined_at timestamptz not null default now(), -- ordre de la liste d'attente
  updated_at timestamptz not null default now(),
  primary key (session_id, user_id)
);
create index session_participants_user_idx on public.session_participants (user_id, status);
create index session_participants_waitlist_idx on public.session_participants (session_id, joined_at) where status = 'waitlist';

-- Messages (chat de session ou de groupe) ------------------------------------
create table public.messages (
  id bigint generated always as identity primary key,
  session_id uuid references public.sessions (id) on delete cascade,
  group_id uuid references public.groups (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null, -- « Compte supprimé »
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint messages_one_target check (num_nonnulls(session_id, group_id) = 1)
);
create index messages_session_idx on public.messages (session_id, created_at desc) where session_id is not null;
create index messages_group_idx on public.messages (group_id, created_at desc) where group_id is not null;
create index messages_user_recent_idx on public.messages (user_id, created_at desc);

-- Avis mutuels ---------------------------------------------------------------
create table public.reviews (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewed_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating in (-1, 1)), -- 👎 / 👍
  tags text[] not null default '{}' check (tags <@ array['punctual', 'fairplay', 'friendly', 'skilled', 'organized']),
  created_at timestamptz not null default now(),
  constraint reviews_not_self check (reviewer_id <> reviewed_id),
  unique (session_id, reviewer_id, reviewed_id)
);
create index reviews_reviewed_idx on public.reviews (reviewed_id);

-- Modération -----------------------------------------------------------------
create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type public.report_target not null,
  target_id text not null,
  reason text not null check (reason in ('spam', 'harassment', 'unsafe', 'fake', 'dating', 'other')),
  details text check (char_length(details) <= 1000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

-- P1 : favoris, abonnements, notifications ------------------------------------
create table public.saved_sessions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, session_id)
);

create table public.follows (
  id bigint generated always as identity primary key,
  follower_id uuid not null references public.profiles (id) on delete cascade,
  host_id uuid references public.profiles (id) on delete cascade,
  group_id uuid references public.groups (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint follows_one_target check (num_nonnulls(host_id, group_id) = 1),
  constraint follows_not_self check (host_id is distinct from follower_id)
);
create unique index follows_host_uniq on public.follows (follower_id, host_id) where host_id is not null;
create unique index follows_group_uniq on public.follows (follower_id, group_id) where group_id is not null;

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('spot_opened', 'session_cancelled', 'reminder_24h', 'reminder_2h', 'checkin', 'new_from_followed', 'review_request')),
  session_id uuid references public.sessions (id) on delete cascade,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  read_at timestamptz,
  pushed_at timestamptz -- rempli par l'Edge Function d'envoi
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unpushed_idx on public.notifications (created_at) where pushed_at is null;
-- Un seul rappel d'un type donné par session et par personne
create unique index notifications_reminder_uniq on public.notifications (user_id, session_id, kind)
  where kind in ('reminder_24h', 'reminder_2h', 'checkin', 'review_request');

-- Réglages plateforme et drapeaux serveur -------------------------------------
create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
