begin;
select plan(26);

select tests.act_as_admin();
create temp table t (k text primary key, v uuid);
grant all on t to anon, authenticated;
insert into t values ('host', tests.make_user('Hote')), ('a', tests.make_user('Alice')), ('x', tests.make_user('Intrus'));
insert into t values ('s', tests.make_session((select v from t where k = 'host')));
insert into public.session_participants (session_id, user_id, status) values ((select v from t where k = 's'), (select v from t where k = 'a'), 'joined');
insert into public.messages (session_id, user_id, body) values ((select v from t where k = 's'), (select v from t where k = 'host'), 'Rendez-vous au chalet');
-- Groupe privé et sa session
insert into public.groups (id, owner_id, name, category_id, city_id, visibility)
values ('d4000000-0000-4000-8000-000000000001', (select v from t where k = 'host'), 'Groupe privé test',
        (select id from public.categories where slug = 'running'), (select id from public.cities where slug = 'montreal'), 'private');
insert into t values ('ps', tests.make_session((select v from t where k = 'host'), 4::smallint, now() + interval '3 days', 'd4000000-0000-4000-8000-000000000001'));

-- Anonyme : explore sans compte, mais rien de personnel ----------------------------
select tests.act_as(null);
select ok((select count(*) from public.sessions where id = (select v from t where k = 's')) = 1, 'anon voit une session publiée');
select is((select count(*)::int from public.sessions where id = (select v from t where k = 'ps')), 0, 'anon ne voit pas une session de groupe privé');
select is((select count(*)::int from public.profiles), 0, 'anon ne lit aucun profil');
select is((select count(*)::int from public.session_participants), 0, 'anon ne lit pas les inscriptions');
select is((select count(*)::int from public.messages), 0, 'anon ne lit aucun message');
select ok(jsonb_array_length(public.feed_sessions((select id from public.cities where slug = 'montreal'))) > 0, 'anon peut appeler le feed');
select throws_ok($$ insert into public.sessions (title) values ('x') $$, '42501', null, 'anon ne peut pas créer de session');
select ok(public.get_session((select v from t where k = 'ps')) is null, 'get_session cache une session de groupe privé');

-- Intrus connecté ---------------------------------------------------------------
select tests.act_as((select v from t where k = 'x'));
select is((select count(*)::int from public.profiles), 1, 'on ne lit que son propre profil');
select is((select count(*)::int from public.messages where session_id = (select v from t where k = 's')), 0, 'pas de messages d''une session dont on n''est pas membre');
select throws_ok(format($$ insert into public.messages (session_id, user_id, body) values (%L, %L, 'spam') $$, (select v from t where k = 's'), (select v from t where k = 'x')),
  '42501', null, 'impossible d''écrire dans le chat sans être inscrit');
select is((select count(*)::int from public.session_participants where session_id = (select v from t where k = 's')), 0, 'pas de liste d''inscrits d''une session étrangère');
select throws_ok(format($$ insert into public.session_participants (session_id, user_id, status) values (%L, %L, 'joined') $$, (select v from t where k = 's'), (select v from t where k = 'x')),
  '42501', null, 'impossible de s''inscrire sans join_session');
update public.sessions set title = 'Piratée' where id = (select v from t where k = 's');
select tests.act_as_admin();
select is((select title from public.sessions where id = (select v from t where k = 's')), 'Session de test', 'impossible de modifier la session d''un autre');
select tests.act_as((select v from t where k = 'x'));
select throws_ok($$ update public.profiles set is_banned = false $$, '42501', null, 'colonne is_banned non modifiable');
select throws_ok($$ update public.profiles set adult_confirmed_at = now() $$, '42501', null, 'adult_confirmed_at non modifiable directement');
select throws_ok(format($$ select public.cancel_session(%L) $$, (select v from t where k = 's')), 'P0001', 'not_host', 'seul l''organisateur annule');
select throws_ok(format($$ select public.record_attendance(%L, '{}') $$, (select v from t where k = 's')), 'P0001', 'not_host', 'seul l''organisateur fait l''appel');
select throws_ok($$ select public.refresh_session_counts(gen_random_uuid()) $$, '42501', null, 'fonctions internes non exécutables');
select throws_ok($$ select public.promote_waitlist(gen_random_uuid()) $$, '42501', null, 'promote_waitlist non exécutable');

-- Participant ---------------------------------------------------------------------
select tests.act_as((select v from t where k = 'a'));
select is((select count(*)::int from public.messages where session_id = (select v from t where k = 's')), 1, 'un participant lit le chat');
select lives_ok(format($$ insert into public.messages (session_id, user_id, body) values (%L, %L, 'J''amène un ballon') $$, (select v from t where k = 's'), (select v from t where k = 'a')),
  'un participant écrit dans le chat');
select throws_ok(format($$ insert into public.messages (session_id, user_id, body) values (%L, %L, 'usurpation') $$, (select v from t where k = 's'), (select v from t where k = 'host')),
  '42501', null, 'impossible d''écrire au nom d''un autre');
select throws_ok(format($$ update public.sessions set status = 'cancelled' where id = %L $$, (select v from t where k = 's')), '42501', null, 'status non modifiable directement');

-- Organisateur : modifie sa session (colonnes autorisées seulement)
select tests.act_as((select v from t where k = 'host'));
update public.sessions set title = 'Basket du soir' where id = (select v from t where k = 's');
select tests.act_as_admin();
select is((select title from public.sessions where id = (select v from t where k = 's')), 'Basket du soir', 'l''organisateur modifie le titre');
select tests.act_as((select v from t where k = 'host'));
select throws_ok(format($$ update public.sessions set places_taken = 0 where id = %L $$, (select v from t where k = 's')), '42501', null, 'compteurs non modifiables');

select * from finish();
rollback;
