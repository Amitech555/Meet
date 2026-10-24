begin;
select plan(12);

select tests.act_as_admin();
create temp table t (k text primary key, v uuid);
grant all on t to anon, authenticated;
insert into t values ('host', tests.make_user('Hote')), ('a', tests.make_user('Alice')), ('b', tests.make_user('Bruno')), ('c', tests.make_user('Chloe'));
-- Trois sessions passées pour obtenir un score de fiabilité
insert into t select 's' || g, tests.make_session((select v from t where k = 'host'), 6::smallint, now() - make_interval(days => g)) from generate_series(1, 3) g;
insert into public.session_participants (session_id, user_id, status)
select t1.v, t2.v, 'joined' from t t1, t t2 where t1.k like 's%' and t2.k in ('a', 'b', 'c');

-- Avant l'appel, personne ne peut évaluer
select tests.act_as((select v from t where k = 'a'));
select throws_ok(format($$ select public.submit_reviews(%L, '[]') $$, (select v from t where k = 's1')), 'P0001', 'not_attendee', 'pas d''avis sans présence confirmée');

-- Appel : Alice présente partout, Bruno absent deux fois sur trois, Chloé jamais là
select tests.act_as((select v from t where k = 'host'));
select lives_ok(format($$ select public.record_attendance(%L, array[%L, %L]::uuid[]) $$, (select v from t where k = 's1'), (select v from t where k = 'a'), (select v from t where k = 'b')), 'appel s1');
select lives_ok(format($$ select public.record_attendance(%L, array[%L]::uuid[]) $$, (select v from t where k = 's2'), (select v from t where k = 'a')), 'appel s2');
select lives_ok(format($$ select public.record_attendance(%L, array[%L]::uuid[]) $$, (select v from t where k = 's3'), (select v from t where k = 'a')), 'appel s3');

select tests.act_as_admin();
select is((select status::text from public.sessions where id = (select v from t where k = 's1')), 'completed', 'session marquée terminée');
select is(public.reliability_score((select v from t where k = 'a')), 100::smallint, 'Alice : 100 %');
select is(public.reliability_score((select v from t where k = 'b')), 33::smallint, 'Bruno : 33 %');
select is(public.reliability_score((select v from t where k = 'host')), 100::smallint, 'L''organisateur est compté présent');

-- Avis : Alice évalue Bruno (présent) et Chloé (absente → ignorée)
select tests.act_as((select v from t where k = 'a'));
select is(public.submit_reviews((select v from t where k = 's1'), jsonb_build_array(
  jsonb_build_object('reviewed_id', (select v from t where k = 'b'), 'rating', 1, 'tags', jsonb_build_array('punctual', 'fairplay')),
  jsonb_build_object('reviewed_id', (select v from t where k = 'c'), 'rating', -1, 'tags', jsonb_build_array())
)), 1, 'seul l''avis sur une personne présente est enregistré');
select throws_ok(format($$ select public.submit_reviews(%L, %L::jsonb) $$, (select v from t where k = 's1'),
  json_build_array(json_build_object('reviewed_id', (select v from t where k = 'b'), 'rating', 1, 'tags', json_build_array('hacker')))::text),
  '23514', null, 'tag inconnu refusé');
select tests.act_as((select v from t where k = 'b'));
select is((select count(*)::int from public.reviews), 0, 'Bruno ne voit pas qui l''a évalué');
select ok((public.get_profile((select v from t where k = 'b')) -> 'tags') @> '[{"tag":"punctual","count":1}]', 'les tags agrégés apparaissent sur le profil');

select * from finish();
rollback;
