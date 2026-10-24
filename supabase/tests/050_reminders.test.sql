begin;
select plan(6);
select tests.act_as_admin();
create temp table t (k text primary key, v uuid);
insert into t values ('host', tests.make_user('Hote')), ('a', tests.make_user('Alice'));
insert into t values
  ('s24', tests.make_session((select v from t where k = 'host'), 6::smallint, now() + interval '24 hours')),
  ('s2', tests.make_session((select v from t where k = 'host'), 6::smallint, now() + interval '2 hours')),
  ('done', tests.make_session((select v from t where k = 'host'), 6::smallint, now() - interval '3 hours'));
insert into public.session_participants (session_id, user_id, status)
select v, (select v from t where k = 'a'), 'joined' from t where k in ('s24', 's2', 'done');

select ok(public.enqueue_reminders() >= 3, 'rappels créés');
select is((select count(*)::int from public.notifications where user_id = (select v from t where k = 'a') and kind = 'reminder_24h' and session_id = (select v from t where k = 's24')), 1, 'rappel 24 h pour Alice');
select is((select count(*)::int from public.notifications where user_id = (select v from t where k = 'a') and kind = 'reminder_2h' and session_id = (select v from t where k = 's2')), 1, 'rappel 2 h pour Alice');
select is((select count(*)::int from public.notifications where user_id = (select v from t where k = 'host') and kind = 'checkin'), 1, 'rappel d''appel pour l''organisateur');
select public.enqueue_reminders();
select is((select count(*)::int from public.notifications where user_id = (select v from t where k = 'a') and kind like 'reminder%'), 2, 'idempotent : pas de doublon au 2e passage');
select tests.act_as((select v from t where k = 'a'));
select throws_ok('select public.enqueue_reminders()', '42501', null, 'non exécutable par un utilisateur');
select * from finish();
rollback;
