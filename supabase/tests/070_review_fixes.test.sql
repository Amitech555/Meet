begin;
select plan(4);
select tests.act_as_admin();
create temp table t (k text primary key, v uuid);
grant all on t to anon, authenticated;
insert into t values ('host', tests.make_user('Hote')), ('fan', tests.make_user('Fan')), ('member', tests.make_user('Membre'));
insert into public.groups (id, owner_id, name, category_id, city_id, visibility)
values ('d5000000-0000-4000-8000-000000000001', (select v from t where k = 'host'), 'Groupe privé', (select id from public.categories where slug = 'running'), (select id from public.cities where slug = 'montreal'), 'private');
insert into public.group_members (group_id, user_id) values ('d5000000-0000-4000-8000-000000000001', (select v from t where k = 'member'));
insert into public.follows (follower_id, host_id) values ((select v from t where k = 'fan'), (select v from t where k = 'host')), ((select v from t where k = 'member'), (select v from t where k = 'host'));

select tests.act_as((select v from t where k = 'host'));
select lives_ok($$ select public.create_session((select id from public.categories where slug = 'running'), 'Sortie secrète', '', now() + interval '2 days', 60, 'Parc', '', 45.52, -73.57, 2::smallint, 8::smallint, 'all', 0, 'flexible', null, null, 'd5000000-0000-4000-8000-000000000001') $$, 'session privée créée');
select tests.act_as_admin();
select is((select count(*)::int from public.notifications where user_id = (select v from t where k = 'fan') and kind = 'new_from_followed'), 0, 'un abonné non membre n''apprend rien d''un groupe privé');
select is((select count(*)::int from public.notifications where user_id = (select v from t where k = 'member') and kind = 'new_from_followed'), 1, 'un abonné membre est prévenu');

select tests.act_as((select v from t where k = 'fan'));
select throws_ok($$ insert into public.reports (reporter_id, target_type, target_id, reason) select auth.uid(), 'user', 'x', 'spam' from generate_series(1, 21) $$, 'P0001', 'rate_limited', 'plus de 20 signalements par jour : refusé');
select * from finish();
rollback;
