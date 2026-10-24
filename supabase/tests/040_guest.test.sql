begin;
select plan(5);
select tests.act_as_admin();
create temp table t (k text primary key, v uuid);
grant all on t to anon, authenticated;
insert into t values ('host', tests.make_user('Hote')), ('a', tests.make_user('Alice')), ('b', tests.make_user('Bruno'));
insert into t values ('s', tests.make_session((select v from t where k = 'host'), 3::smallint));

select tests.act_as((select v from t where k = 'a'));
select is(public.join_session((select v from t where k = 's')) ->> 'status', 'joined', 'Alice rejoint');
select is((public.set_guest((select v from t where k = 's'), true) ->> 'places_taken')::int, 3, 'Alice ajoute un invité : complet');
select tests.act_as((select v from t where k = 'b'));
select is(public.join_session((select v from t where k = 's')) ->> 'status', 'waitlist', 'Bruno passe en attente');
select tests.act_as((select v from t where k = 'a'));
select lives_ok(format('select public.set_guest(%L, false)', (select v from t where k = 's')), 'Alice retire son invité');
select tests.act_as_admin();
select is((select status::text from public.session_participants where session_id = (select v from t where k = 's') and user_id = (select v from t where k = 'b')), 'joined', 'La place libérée va à Bruno');
select * from finish();
rollback;
