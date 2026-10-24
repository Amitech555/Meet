begin;
select plan(3);
select tests.act_as_admin();
create temp table t (k text primary key, v uuid);
grant all on t to anon, authenticated;
insert into t values ('host', tests.make_user('Hote'));
insert into t values
  ('old', tests.make_session((select v from t where k = 'host'), 6::smallint, now() - interval '3 days')),
  ('tooold', tests.make_session((select v from t where k = 'host'), 6::smallint, now() - interval '20 days')),
  ('next', tests.make_session((select v from t where k = 'host'), 6::smallint, now() + interval '2 days'));
select tests.act_as((select v from t where k = 'host'));
select ok(public.my_sessions('hosting') @> jsonb_build_array(jsonb_build_object('id', (select v from t where k = 'old'), 'needs_checkin', true)), 'session d''il y a 3 jours encore à pointer');
select ok(public.my_sessions('hosting') @> jsonb_build_array(jsonb_build_object('id', (select v from t where k = 'next'))), 'session à venir présente');
select ok(not (public.my_sessions('hosting') @> jsonb_build_array(jsonb_build_object('id', (select v from t where k = 'tooold')))), 'au-delà de 14 jours : plus dans la liste');
select * from finish();
rollback;
