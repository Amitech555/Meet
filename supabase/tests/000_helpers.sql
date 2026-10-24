-- Aides de test partagées (créées dans le schéma `tests`, rejouables).
begin;
create extension if not exists pgtap with schema extensions;
create schema if not exists tests;

-- Crée un utilisateur prêt (profil complété) et renvoie son id
create or replace function tests.make_user(p_name text, p_ready boolean default true)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
          lower(p_name) || '-' || left(uid::text, 8) || '@test.local', jsonb_build_object('full_name', p_name), now(), now());
  if p_ready then
    update public.profiles set adult_confirmed_at = now(), terms_accepted_at = now(), terms_version = 'test',
      city_id = (select id from public.cities where slug = 'montreal') where id = uid;
  end if;
  return uid;
end $$;

-- Se faire passer pour un utilisateur (ou anon si null)
create or replace function tests.act_as(p_user uuid)
returns void language plpgsql as $$
begin
  if p_user is null then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    execute 'set local role anon';
  else
    perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
  end if;
end $$;

create or replace function tests.act_as_admin()
returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;

-- Session de test directe (contourne create_session pour contrôler les dates)
create or replace function tests.make_session(p_host uuid, p_max smallint default 4, p_starts timestamptz default now() + interval '2 days', p_group uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare sid uuid;
begin
  insert into public.sessions (host_id, group_id, category_id, title, starts_at, ends_at, venue_name, location, city_id, min_players, max_players)
  values (p_host, p_group, (select id from public.categories where slug = 'basketball'), 'Session de test',
          p_starts, p_starts + interval '90 minutes', 'Parc de test',
          extensions.st_point(-73.57, 45.52, 4326)::extensions.geography,
          (select id from public.cities where slug = 'montreal'), 2, p_max)
  returning id into sid;
  insert into public.session_participants (session_id, user_id, status) values (sid, p_host, 'joined');
  return sid;
end $$;

grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;
select plan(1);
select pass('aides de test installées');
select * from finish();
commit;
