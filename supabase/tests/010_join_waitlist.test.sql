begin;
select plan(24);

select tests.act_as_admin();
create temp table t (k text primary key, v uuid);
grant all on t to anon, authenticated;
insert into t values
  ('host', tests.make_user('Hote')), ('a', tests.make_user('Alice')), ('b', tests.make_user('Bruno')),
  ('c', tests.make_user('Chloe')), ('d', tests.make_user('Dina')), ('newbie', tests.make_user('Nouveau', false));
insert into t values ('s', tests.make_session((select v from t where k = 'host'), 3::smallint));

-- 1. Rejoindre : place libre
select tests.act_as((select v from t where k = 'a'));
select is(public.join_session((select v from t where k = 's')) ->> 'status', 'joined', 'Alice rejoint (place libre)');
select is(public.join_session((select v from t where k = 's')) ->> 'status', 'joined', 'Double tap : idempotent');

select tests.act_as((select v from t where k = 'b'));
select is(public.join_session((select v from t where k = 's')) ->> 'status', 'joined', 'Bruno prend la dernière place');

-- 2. Complet → liste d'attente, avec position
select tests.act_as((select v from t where k = 'c'));
select is(public.join_session((select v from t where k = 's')) ->> 'status', 'waitlist', 'Chloé : complet → liste d''attente');
select tests.act_as((select v from t where k = 'd'));
select is((public.join_session((select v from t where k = 's')) ->> 'position')::int, 2, 'Dina est 2e sur la liste');

select tests.act_as_admin();
select is((select places_taken::int from public.sessions where id = (select v from t where k = 's')), 3, 'Compteur places_taken = 3');
select is((select waitlist_count::int from public.sessions where id = (select v from t where k = 's')), 2, 'Compteur waitlist_count = 2');

-- 3. Désistement → promotion automatique du premier en attente + notification
select tests.act_as((select v from t where k = 'a'));
select is(public.leave_session((select v from t where k = 's')) ->> 'status', 'cancelled', 'Alice se désiste');
select tests.act_as_admin();
select is((select status::text from public.session_participants where session_id = (select v from t where k = 's') and user_id = (select v from t where k = 'c')),
  'joined', 'Chloé est promue');
select is((select status::text from public.session_participants where session_id = (select v from t where k = 's') and user_id = (select v from t where k = 'd')),
  'waitlist', 'Dina reste en attente');
select ok(exists(select 1 from public.notifications where user_id = (select v from t where k = 'c') and kind = 'spot_opened'), 'Chloé est notifiée');
select is((select places_taken::int from public.sessions where id = (select v from t where k = 's')), 3, 'Jamais plus que max_players');

-- 4. Revenir après désistement : derrière la file existante
select tests.act_as((select v from t where k = 'a'));
select is(public.join_session((select v from t where k = 's')) ->> 'status', 'waitlist', 'Alice revient : elle passe derrière Dina');

-- 5. L'organisateur ne peut pas quitter, augmenter la capacité promeut la file
select tests.act_as((select v from t where k = 'host'));
select throws_ok(format('select public.leave_session(%L)', (select v from t where k = 's')), 'P0001', 'host_cannot_leave', 'L''organisateur ne peut pas se désister');
update public.sessions set max_players = 5 where id = (select v from t where k = 's');
select tests.act_as_admin();
select is((select places_taken::int from public.sessions where id = (select v from t where k = 's')), 5, 'Capacité +2 → deux promus');
select is((select waitlist_count::int from public.sessions where id = (select v from t where k = 's')), 0, 'Liste vide');

-- 6. Règles de sécurité
select tests.act_as((select v from t where k = 'newbie'));
select throws_ok(format('select public.join_session(%L)', (select v from t where k = 's')), 'P0001', 'terms_required', 'Profil incomplet (18+/conditions) : refusé');

select tests.act_as(null);
select throws_ok(format('select public.join_session(%L)', (select v from t where k = 's')), '42501', null, 'Anonyme : pas le droit d''exécuter join_session');

select tests.act_as_admin();
insert into t values ('past', tests.make_session((select v from t where k = 'host'), 4::smallint, now() - interval '1 hour'));
select tests.act_as((select v from t where k = 'a'));
select throws_ok(format('select public.join_session(%L)', (select v from t where k = 'past')), 'P0001', 'session_started', 'Session commencée : refusé');

-- Blocage : l'organisateur bloque Bruno
select tests.act_as_admin();
insert into t values ('s2', tests.make_session((select v from t where k = 'host'), 6::smallint));
insert into public.blocks values ((select v from t where k = 'host'), (select v from t where k = 'b'));
select tests.act_as((select v from t where k = 'b'));
select throws_ok(format('select public.join_session(%L)', (select v from t where k = 's2')), 'P0001', 'blocked', 'Bloqué par l''organisateur : refusé');

-- +1 : un invité compte pour une place
select tests.act_as((select v from t where k = 'a'));
select is(public.join_session((select v from t where k = 's2'), true) ->> 'status', 'joined', 'Alice vient avec un invité');
select tests.act_as_admin();
select is((select places_taken::int from public.sessions where id = (select v from t where k = 's2')), 3, 'Hôte + Alice + invité = 3 places');

-- Annulation par l'organisateur : notifications
select tests.act_as((select v from t where k = 'host'));
select lives_ok(format('select public.cancel_session(%L, %L)', (select v from t where k = 's2'), 'Pluie annoncée'), 'L''organisateur annule');
select tests.act_as_admin();
select ok(exists(select 1 from public.notifications where user_id = (select v from t where k = 'a') and kind = 'session_cancelled'), 'Alice est prévenue de l''annulation');

select * from finish();
rollback;
