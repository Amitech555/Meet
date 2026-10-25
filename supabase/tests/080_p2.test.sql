begin;
select plan(17);
select tests.act_as_admin();
create temp table t (k text primary key, v uuid);
grant all on t to anon, authenticated;
insert into t values ('owner', tests.make_user('Proprio')), ('co', tests.make_user('Coorg')), ('trusted', tests.make_user('Fiable')),
  ('plain', tests.make_user('Simple')), ('staff', tests.make_user('Equipe')), ('troll', tests.make_user('Troll'));
update public.profiles set is_admin = true where id = (select v from t where k = 'staff');
insert into public.groups (id, owner_id, name, category_id, city_id)
values ('d6000000-0000-4000-8000-000000000001', (select v from t where k = 'owner'), 'Club test', (select id from public.categories where slug = 'running'), (select id from public.cities where slug = 'montreal'));
insert into public.group_members (group_id, user_id) select 'd6000000-0000-4000-8000-000000000001', v from t where k in ('co', 'trusted', 'plain');
insert into t values ('s', tests.make_session((select v from t where k = 'owner'), 6::smallint, now() + interval '3 days', 'd6000000-0000-4000-8000-000000000001'));

-- Co-organisateurs et confiance
select tests.act_as((select v from t where k = 'co'));
select throws_ok($$ select public.set_group_member('d6000000-0000-4000-8000-000000000001', (select v from t where k = 'plain'), 'admin', null) $$, 'P0001', 'not_group_admin', 'un membre ne nomme personne');
select tests.act_as((select v from t where k = 'owner'));
select lives_ok($$ select public.set_group_member('d6000000-0000-4000-8000-000000000001', (select v from t where k = 'co'), 'admin', null) $$, 'le propriétaire nomme un co-organisateur');
select tests.act_as((select v from t where k = 'co'));
select throws_ok($$ select public.set_group_member('d6000000-0000-4000-8000-000000000001', (select v from t where k = 'plain'), 'admin', null) $$, 'P0001', 'owner_only', 'un co-organisateur ne nomme pas d''autres co-organisateurs');
select lives_ok($$ select public.set_group_member('d6000000-0000-4000-8000-000000000001', (select v from t where k = 'trusted'), null, true) $$, 'un co-organisateur marque un joueur de confiance');
select ok(public.can_manage_session((select v from t where k = 's'), (select v from t where k = 'co')), 'le co-organisateur peut gérer la session du groupe');
select is(jsonb_array_length(public.group_members_list('d6000000-0000-4000-8000-000000000001')), 4, 'liste des membres visible aux membres');

-- Fenêtre prioritaire
select lives_ok(format($$ select public.set_priority_window(%L, 24) $$, (select v from t where k = 's')), 'fenêtre prioritaire de 24 h');
select tests.act_as((select v from t where k = 'plain'));
select throws_ok(format($$ select public.join_session(%L) $$, (select v from t where k = 's')), 'P0001', 'priority_window', 'un membre ordinaire attend la fin de la fenêtre');
select tests.act_as((select v from t where k = 'trusted'));
select is(public.join_session((select v from t where k = 's')) ->> 'status', 'joined', 'un joueur de confiance entre pendant la fenêtre');
select tests.act_as_admin();
select ok(exists(select 1 from public.notifications where user_id = (select v from t where k = 'trusted') and kind = 'priority_access'), 'le joueur de confiance est prévenu');

-- Le co-organisateur annule
select tests.act_as((select v from t where k = 'co'));
select lives_ok(format($$ select public.cancel_session(%L, 'Pluie') $$, (select v from t where k = 's')), 'le co-organisateur annule');

-- Tableau de bord organisateur
select tests.act_as((select v from t where k = 'owner'));
select ok(public.host_dashboard(90) ? 'fill_rate', 'tableau de bord organisateur');

-- Back-office : réservé à l'équipe
insert into public.reports (reporter_id, target_type, target_id, reason) values ((select v from t where k = 'owner'), 'user', (select v from t where k = 'troll')::text, 'harassment');
select throws_ok($$ select public.admin_list_reports() $$, '42501', null, 'un utilisateur n''accède pas au back-office');
select tests.act_as_admin();
create temp table rid as select id from public.reports where target_id = (select v from t where k = 'troll')::text;
grant select on rid to authenticated;
select tests.act_as((select v from t where k = 'staff'));
select ok(jsonb_array_length(public.admin_list_reports('open')) >= 1, 'l''équipe voit les signalements ouverts');
select lives_ok($$ select public.admin_resolve_report((select id from rid limit 1), 'ban_user', 'actioned') $$, 'bannir depuis un signalement');
select tests.act_as((select v from t where k = 'troll'));
select throws_ok(format($$ select public.join_session(%L) $$, (select v from t where k = 's')), 'P0001', null, 'un compte banni ne peut plus rejoindre');
select throws_ok($$ update public.profiles set is_admin = true where id = auth.uid() $$, '42501', null, 'impossible de se donner les droits admin');
select * from finish();
rollback;
