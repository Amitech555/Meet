#!/usr/bin/env bash
# Exporte la base de démo locale (après `supabase db reset`) vers src/lib/demo/snapshot.json,
# utilisée par le mode démo web (aperçu sans serveur). Les dates sont recalées au jour de l'affichage.
set -euo pipefail
DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
OUT="$(dirname "$0")/../src/lib/demo/snapshot.json"
psql "$DB_URL" -qAt -v ON_ERROR_STOP=1 > "$OUT" <<'SQL'
select (jsonb_build_object(
  'snapshot_at', now(),
  'cities', (select jsonb_agg(jsonb_build_object('id', id, 'slug', slug, 'name', name, 'region', region, 'is_active', is_active,
     'lat', extensions.st_y(location::extensions.geometry), 'lng', extensions.st_x(location::extensions.geometry)) order by id) from public.cities),
  'categories', (select jsonb_agg(to_jsonb(c) order by c.sort) from public.categories c),
  'profiles', (select jsonb_agg(jsonb_build_object('id', id, 'display_name', display_name, 'avatar_url', avatar_url, 'bio', bio, 'city_id', city_id,
     'locale', locale, 'adult_confirmed_at', adult_confirmed_at, 'terms_accepted_at', terms_accepted_at, 'terms_version', terms_version,
     'phone_verified_at', phone_verified_at, 'is_banned', is_banned, 'is_admin', is_admin, 'created_at', created_at)) from public.profiles),
  'user_interests', (select coalesce(jsonb_agg(to_jsonb(u)), '[]') from public.user_interests u),
  'groups', (select jsonb_agg(to_jsonb(g)) from public.groups g),
  'group_members', (select jsonb_agg(to_jsonb(m)) from public.group_members m),
  'sessions', (select jsonb_agg(to_jsonb(s) - 'location' - 'search_text' || jsonb_build_object(
     'lat', extensions.st_y(s.location::extensions.geometry), 'lng', extensions.st_x(s.location::extensions.geometry))) from public.sessions s),
  'session_participants', (select jsonb_agg(to_jsonb(p)) from public.session_participants p),
  'messages', (select coalesce(jsonb_agg(to_jsonb(m)), '[]') from public.messages m),
  'reviews', (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from public.reviews r),
  'reports', (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from public.reports r),
  'follows', (select coalesce(jsonb_agg(to_jsonb(f)), '[]') from public.follows f),
  'notifications', '[]'::jsonb
))::text
SQL
echo "Instantané écrit : $OUT ($(wc -c < "$OUT") octets)"
