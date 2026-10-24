#!/usr/bin/env bash
# Test de concurrence réel : N personnes cliquent « Je suis partant » en même temps, sur des
# connexions séparées, pour une session de MAX places. Vérifie qu'on ne dépasse jamais MAX.
set -euo pipefail
DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
N="${N:-30}"
MAX="${MAX:-10}"
RUN="race-$(date +%s)"

psql "$DB_URL" -qAt -v ON_ERROR_STOP=1 >/dev/null <<SQL
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       '$RUN-' || g || '@test.local', now(), now()
from generate_series(0, $N) g;
update public.profiles set adult_confirmed_at = now(), terms_accepted_at = now(), terms_version = 'test'
where id in (select id from auth.users where email like '$RUN-%');
SQL

HOST=$(psql "$DB_URL" -qAt -c "select id from auth.users where email = '$RUN-0@test.local'")
SESSION=$(psql "$DB_URL" -qAt -c "
  with s as (
    insert into public.sessions (host_id, category_id, title, starts_at, ends_at, venue_name, location, city_id, max_players)
    values ('$HOST', (select id from public.categories limit 1), 'Course à la dernière place',
            now() + interval '1 day', now() + interval '1 day 1 hour', 'Parc test',
            extensions.st_point(-73.57, 45.52, 4326)::extensions.geography, (select id from public.cities where slug = 'montreal'), $MAX)
    returning id)
  insert into public.session_participants (session_id, user_id, status) select id, '$HOST', 'joined' from s returning session_id")

USERS=$(psql "$DB_URL" -qAt -c "select id from auth.users where email like '$RUN-%' and id <> '$HOST'")
for U in $USERS; do
  psql "$DB_URL" -qAt >/dev/null 2>&1 <<SQL &
begin;
select set_config('request.jwt.claims', '{"sub":"$U","role":"authenticated"}', true);
set local role authenticated;
select public.join_session('$SESSION');
select pg_sleep(0.02);
commit;
SQL
done
wait

RESULT=$(psql "$DB_URL" -qAt -c "
  select count(*) filter (where status = 'joined') || ' ' || count(*) filter (where status = 'waitlist') || ' ' ||
         (select places_taken from public.sessions where id = '$SESSION') || ' ' ||
         (select count(distinct joined_at) from public.session_participants where session_id = '$SESSION' and status = 'waitlist')
  from public.session_participants where session_id = '$SESSION'")
read -r JOINED WAITING TAKEN DISTINCT_TS <<<"$RESULT"

psql "$DB_URL" -qAt -c "delete from auth.users where email like '$RUN-%'; delete from public.sessions where id = '$SESSION';" >/dev/null

echo "Inscrits : $JOINED / $MAX · liste d'attente : $WAITING · compteur : $TAKEN"
if [[ "$JOINED" -eq "$MAX" && "$TAKEN" -eq "$MAX" && "$WAITING" -eq $((N + 1 - MAX)) && "$DISTINCT_TS" -eq "$WAITING" ]]; then
  echo "OK : jamais plus de $MAX places, file d'attente ordonnée"
else
  echo "ÉCHEC : sur-réservation ou compteur incohérent" >&2
  exit 1
fi
