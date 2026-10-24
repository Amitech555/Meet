-- Partants — données de démo pour Montréal (dev uniquement : `npm run db:reset`).
-- Lieux réels, horaires relatifs à maintenant pour que la démo reste crédible.
-- Comptes de démo : demo+<prénom>@partants.app / mot de passe « partants-demo ».

-- Villes ---------------------------------------------------------------------
insert into public.cities (slug, name, region, location, is_active) values
  ('montreal', 'Montréal', 'Québec', extensions.st_point(-73.5617, 45.5089, 4326)::extensions.geography, true),
  ('laval', 'Laval', 'Québec', extensions.st_point(-73.7124, 45.5697, 4326)::extensions.geography, false),
  ('quebec', 'Québec', 'Québec', extensions.st_point(-71.2080, 46.8139, 4326)::extensions.geography, false);

-- Catégories : 12 familles + Autre, avec sous-catégories -----------------------
insert into public.categories (slug, name_fr, name_en, icon, tint, sort) values
  ('team-sports', 'Sport collectif', 'Team sports', 'team-sports', 'jaune', 10),
  ('running', 'Course & marche', 'Running & walking', 'running', 'orange', 20),
  ('cycling', 'Vélo', 'Cycling', 'cycling', 'ciel', 30),
  ('golf', 'Golf', 'Golf', 'golf', 'mousse', 40),
  ('horse-riding', 'Équitation', 'Horse riding', 'horse-riding', 'terracotta', 50),
  ('racket', 'Raquette', 'Racket sports', 'racket', 'turquoise', 60),
  ('fitness', 'Fitness & yoga', 'Fitness & yoga', 'fitness', 'menthe', 70),
  ('outdoors', 'Plein air', 'Outdoors', 'outdoors', 'sapin', 80),
  ('combat', 'Sports de combat', 'Combat sports', 'combat', 'rouge', 90),
  ('board-games', 'Jeux de société & cartes', 'Board & card games', 'board-games', 'encre', 100),
  ('esports', 'Jeux vidéo', 'Video games', 'esports', 'electrique', 110),
  ('creative', 'Créatif', 'Creative', 'creative', 'framboise', 120),
  ('other', 'Autre', 'Other', 'other', 'sable', 999);

insert into public.categories (slug, name_fr, name_en, icon, tint, parent_id, sort)
select v.slug, v.name_fr, v.name_en, v.icon, p.tint, p.id, v.sort
from (values
  ('basketball', 'Basket', 'Basketball', 'basketball', 'team-sports', 11),
  ('soccer', 'Soccer', 'Soccer', 'soccer', 'team-sports', 12),
  ('volleyball', 'Volleyball', 'Volleyball', 'volleyball', 'team-sports', 13),
  ('hockey', 'Hockey', 'Hockey', 'hockey', 'team-sports', 14),
  ('ultimate', 'Ultimate', 'Ultimate', 'ultimate', 'team-sports', 15),
  ('tennis', 'Tennis', 'Tennis', 'tennis', 'racket', 61),
  ('pickleball', 'Pickleball', 'Pickleball', 'racket', 'racket', 62),
  ('badminton', 'Badminton', 'Badminton', 'racket', 'racket', 63)
) as v(slug, name_fr, name_en, icon, parent_slug, sort)
join public.categories p on p.slug = v.parent_slug;

-- Comptes de démo ----------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', v.id::uuid, 'authenticated', 'authenticated', v.email,
       extensions.crypt('partants-demo', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', v.name),
       now() - (v.age_days || ' days')::interval, now()
from (values
  ('a1000000-0000-4000-8000-000000000001', 'demo+camille@partants.app', 'Camille Tremblay', 420),
  ('a1000000-0000-4000-8000-000000000002', 'demo+karim@partants.app', 'Karim Haddad', 380),
  ('a1000000-0000-4000-8000-000000000003', 'demo+sophie@partants.app', 'Sophie Gagnon', 300),
  ('a1000000-0000-4000-8000-000000000004', 'demo+jb@partants.app', 'Jean-Baptiste Lavoie', 260),
  ('a1000000-0000-4000-8000-000000000005', 'demo+mai@partants.app', 'Mai Nguyen', 200),
  ('a1000000-0000-4000-8000-000000000006', 'demo+olivier@partants.app', 'Olivier Roy', 180),
  ('a1000000-0000-4000-8000-000000000007', 'demo+fatou@partants.app', 'Fatou Diallo', 150),
  ('a1000000-0000-4000-8000-000000000008', 'demo+gabriel@partants.app', 'Gabriel Côté', 120),
  ('a1000000-0000-4000-8000-000000000009', 'demo+ines@partants.app', 'Inès Benali', 90),
  ('a1000000-0000-4000-8000-000000000010', 'demo+lucas@partants.app', 'Lucas Martin', 75),
  ('a1000000-0000-4000-8000-000000000011', 'demo+ana@partants.app', 'Ana Rodriguez', 60),
  ('a1000000-0000-4000-8000-000000000012', 'demo+theo@partants.app', 'Théo Bergeron', 45),
  ('a1000000-0000-4000-8000-000000000013', 'demo+chloe@partants.app', 'Chloé Pelletier', 30),
  ('a1000000-0000-4000-8000-000000000014', 'demo+samuel@partants.app', 'Samuel Ouellet', 20),
  ('a1000000-0000-4000-8000-000000000015', 'demo+yasmine@partants.app', 'Yasmine El Amrani', 10),
  ('a1000000-0000-4000-8000-000000000016', 'demo+felix@partants.app', 'Félix Gauthier', 5)
) as v(id, email, name, age_days);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), u.id, u.id::text, jsonb_build_object('sub', u.id::text, 'email', u.email), 'email', now(), now(), now()
from auth.users u where u.email like 'demo+%@partants.app';

-- Profils complétés (le trigger handle_new_user a créé les lignes)
update public.profiles p
set adult_confirmed_at = now(),
    terms_accepted_at = now(),
    terms_version = '2026-10-24',
    city_id = (select id from public.cities where slug = 'montreal'),
    bio = v.bio,
    phone_verified_at = case when v.verified then now() end
from (values
  ('a1000000-0000-4000-8000-000000000001', 'Basket au parc La Fontaine tous les jeudis. Je ramène toujours un ballon de trop.', true),
  ('a1000000-0000-4000-8000-000000000002', 'Club de course du mardi à Griffintown. Allure conversation, promis.', true),
  ('a1000000-0000-4000-8000-000000000003', 'Soirées jeux à Griffintown. Catan, Azul, Codenames.', false),
  ('a1000000-0000-4000-8000-000000000004', 'Pickleball, tennis, badminton : si ça a une raquette, je suis là.', true),
  ('a1000000-0000-4000-8000-000000000005', 'Rando et lever de soleil sur le mont Royal.', false),
  ('a1000000-0000-4000-8000-000000000006', 'Golfeur du dimanche, handicap honnête.', true),
  ('a1000000-0000-4000-8000-000000000007', 'Écurie à Saint-Lazare, balades pour tous les niveaux.', true),
  ('a1000000-0000-4000-8000-000000000008', 'Soccer à 7 au parc Jarry. Gardien à mes heures.', false),
  ('a1000000-0000-4000-8000-000000000009', 'Yoga au parc et vélo le long du canal.', false),
  ('a1000000-0000-4000-8000-000000000010', 'Nouvel arrivant de Lyon. Partant pour tout.', false),
  ('a1000000-0000-4000-8000-000000000011', 'Volleyball de plage au parc Jean-Drapeau.', false),
  ('a1000000-0000-4000-8000-000000000012', 'Ultimate frisbee, esprit du jeu avant tout.', false),
  ('a1000000-0000-4000-8000-000000000013', 'Atelier croquis au Vieux-Port, crayons fournis.', false),
  ('a1000000-0000-4000-8000-000000000014', 'Boxe le samedi matin.', false),
  ('a1000000-0000-4000-8000-000000000015', 'Mario Kart et Smash, tournois amicaux.', false),
  ('a1000000-0000-4000-8000-000000000016', 'Je découvre la ville, une activité à la fois.', false)
) as v(id, bio, verified)
where p.id = v.id::uuid;

insert into public.user_interests (user_id, category_id)
select p.id, c.id from public.profiles p
join public.categories c on c.slug in ('basketball', 'running', 'board-games', 'outdoors')
where p.id::text like 'a1000000-%';

-- Groupes récurrents ------------------------------------------------------------
insert into public.groups (id, owner_id, name, description, category_id, city_id, rhythm_label, visibility, invite_code) values
  ('b2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 'Course Griffintown du mardi',
   'Départ du marché Atwater, 6 à 8 km le long du canal Lachine. Deux groupes d''allure, personne ne court seul.',
   (select id from public.categories where slug = 'running'), (select id from public.cities where slug = 'montreal'),
   'Tous les mardis 6 h 30', 'public', 'griffin-mardi'),
  ('b2000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'Basket du jeudi — La Fontaine',
   'Pick-up 3 contre 3 ou 5 contre 5 selon le monde. Niveau intermédiaire, bonne ambiance.',
   (select id from public.categories where slug = 'basketball'), (select id from public.cities where slug = 'montreal'),
   'Tous les jeudis 18 h 30', 'public', 'basket-jeudi'),
  ('b2000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', 'Les Joueurs du Canal',
   'Soirées jeux de société au café, jeux fournis. On explique les règles.',
   (select id from public.categories where slug = 'board-games'), (select id from public.cities where slug = 'montreal'),
   'Aux 2 semaines, le vendredi', 'public', 'joueurs-canal');

insert into public.group_members (group_id, user_id)
select 'b2000000-0000-4000-8000-000000000001'::uuid, id from public.profiles where id::text like 'a1000000-%' and id::text between 'a1000000-0000-4000-8000-000000000004' and 'a1000000-0000-4000-8000-000000000014'
on conflict do nothing;
insert into public.group_members (group_id, user_id)
select 'b2000000-0000-4000-8000-000000000002'::uuid, id from public.profiles where id::text like 'a1000000-%' and id::text between 'a1000000-0000-4000-8000-000000000005' and 'a1000000-0000-4000-8000-000000000012'
on conflict do nothing;
insert into public.group_members (group_id, user_id)
select 'b2000000-0000-4000-8000-000000000003'::uuid, id from public.profiles where id::text like 'a1000000-%' and id::text between 'a1000000-0000-4000-8000-000000000008' and 'a1000000-0000-4000-8000-000000000016'
on conflict do nothing;

-- Sessions : 22 à venir + 6 passées --------------------------------------------------
-- day_offset / heure murale de Montréal → converties en UTC
create temporary table demo_sessions (
  n int, host int, cat text, title text, descr text, day_offset int, hh int, mm int, dur int,
  venue text, address text, lat float8, lng float8, min_p int, max_p int, lvl text, price int, grp int, joined int
);

insert into demo_sessions values
  (1, 1, 'basketball', 'Basket 3 contre 3 au parc La Fontaine', 'Terrain extérieur près du chalet. On fait des équipes sur place. Amène de l''eau.', 0, 18, 30, 90, 'Parc La Fontaine', '3933 av. du Parc-La Fontaine, Montréal', 45.5277, -73.5695, 6, 8, 'intermediate', 0, 2, 6),
  (2, 2, 'running', 'Course du canal Lachine — 8 km', 'Départ devant le marché Atwater. Deux groupes : 5:30/km et 6:15/km.', 1, 6, 30, 60, 'Marché Atwater', '138 av. Atwater, Montréal', 45.4807, -73.5772, 2, 25, 'all', 0, 1, 14),
  (3, 3, 'board-games', 'Soirée jeux : Catan, Azul et compagnie', 'Jeux fournis, on explique les règles. Le café prend 8 $ pour la table et un breuvage.', 2, 19, 0, 180, 'Café Ludik', '1215 rue Wellington, Montréal', 45.4925, -73.5605, 4, 12, 'beginner', 800, 3, 11),
  (4, 4, 'pickleball', 'Pickleball débutant au Vieux-Port', 'Raquettes à prêter. On apprend le service et le comptage, puis on joue.', 3, 10, 0, 90, 'Quai de l''Horloge', 'Quai de l''Horloge, Vieux-Port de Montréal', 45.5105, -73.5469, 4, 8, 'beginner', 1200, null, 8),
  (5, 5, 'outdoors', 'Montée du mont Royal au lever du soleil', 'Rendez-vous au monument Cartier, on monte par les escaliers jusqu''au belvédère Kondiaronk.', 4, 6, 45, 90, 'Monument à sir George-Étienne Cartier', 'Av. du Parc, Montréal', 45.5141, -73.5865, 2, 15, 'all', 0, null, 3),
  (6, 6, 'golf', 'Neuf trous au golf municipal', 'Départ réservé pour 4. Location de bâtons possible sur place.', 5, 8, 0, 150, 'Golf municipal de Montréal', '4235 rue Viau, Montréal', 45.5642, -73.5534, 2, 4, 'all', 3500, null, 2),
  (7, 7, 'horse-riding', 'Balade à cheval en sentier', 'Initiation et balade d''une heure. Casque fourni. Covoiturage depuis le métro Côte-Vertu.', 6, 13, 0, 120, 'Écurie du Lac', 'Saint-Lazare, Québec', 45.4000, -74.1300, 2, 6, 'beginner', 6500, null, 3),
  (8, 8, 'soccer', 'Soccer à 7 au parc Jarry', 'Chasubles fournies. Crampons moulés seulement.', 1, 19, 0, 90, 'Parc Jarry', '285 rue Faillon O., Montréal', 45.5338, -73.6286, 10, 14, 'intermediate', 0, null, 12),
  (9, 9, 'fitness', 'Yoga au parc au coucher du soleil', 'Tous niveaux. Apporte ton tapis.', 0, 19, 0, 60, 'Parc La Fontaine', 'Près de l''étang, Montréal', 45.5260, -73.5680, 3, 20, 'all', 0, null, 9),
  (10, 10, 'cycling', 'Tour du canal à vélo — 25 km', 'Rythme tranquille, arrêt crème glacée au parc Monk.', 2, 10, 0, 120, 'Square Gallery', 'Rue Ottawa, Griffintown', 45.4955, -73.5620, 3, 12, 'all', 0, null, 5),
  (11, 11, 'volleyball', 'Volleyball de plage à Jean-Drapeau', 'Deux terrains réservés. Équipes mélangées.', 3, 17, 30, 120, 'Plage Jean-Doré', 'Parc Jean-Drapeau, Montréal', 45.5085, -73.5320, 8, 12, 'intermediate', 0, null, 7),
  (12, 12, 'ultimate', 'Ultimate amical au parc Laurier', 'Esprit du jeu avant tout. Disques fournis.', 4, 18, 0, 90, 'Parc Laurier', 'Rue Brébeuf, Montréal', 45.5317, -73.5836, 8, 14, 'all', 0, null, 6),
  (13, 13, 'creative', 'Croquis urbain au Vieux-Port', 'Carnets et crayons fournis. On dessine les quais et on compare.', 5, 14, 0, 120, 'Place Jacques-Cartier', 'Place Jacques-Cartier, Montréal', 45.5076, -73.5530, 2, 10, 'beginner', 0, null, 4),
  (14, 14, 'combat', 'Boxe cardio du samedi', 'Gants à prêter. Pas de combat, que du sac et de la technique.', 5, 9, 0, 60, 'Club de boxe Champions', '4955 rue Jarry E., Montréal', 45.5845, -73.5960, 4, 10, 'beginner', 1500, null, 8),
  (15, 15, 'esports', 'Tournoi Mario Kart amical', 'Quatre manettes, écran géant, bracket simple.', 2, 20, 0, 150, 'Café Arcade', '2111 rue Saint-Denis, Montréal', 45.5165, -73.5670, 4, 16, 'all', 500, null, 10),
  (16, 1, 'basketball', 'Basket du jeudi — 5 contre 5', 'Le rendez-vous du groupe. Si on est plus de 10, on fait des rotations.', 7, 18, 30, 90, 'Parc La Fontaine', '3933 av. du Parc-La Fontaine, Montréal', 45.5277, -73.5695, 6, 12, 'intermediate', 0, 2, 4),
  (17, 2, 'running', 'Course du canal Lachine — 8 km', 'Départ devant le marché Atwater. Deux groupes : 5:30/km et 6:15/km.', 8, 6, 30, 60, 'Marché Atwater', '138 av. Atwater, Montréal', 45.4807, -73.5772, 2, 25, 'all', 0, 1, 6),
  (18, 4, 'tennis', 'Tennis en double au parc Jeanne-Mance', 'Niveau intermédiaire. Balles neuves fournies.', 1, 17, 30, 90, 'Parc Jeanne-Mance', 'Av. du Parc, Montréal', 45.5145, -73.5840, 4, 4, 'intermediate', 0, null, 3),
  (19, 8, 'hockey', 'Hockey bottine à la patinoire du parc Jarry', 'Bâtons de rechange disponibles. Casque recommandé.', 6, 19, 30, 90, 'Parc Jarry', '285 rue Faillon O., Montréal', 45.5338, -73.6286, 6, 12, 'all', 0, null, 5),
  (20, 3, 'board-games', 'Codenames et Dixit au Vieux-Montréal', 'Jeux d''ambiance, parfaits pour rencontrer du monde.', 9, 19, 30, 150, 'Le Placard Ludique', '402 rue Notre-Dame O., Montréal', 45.5025, -73.5590, 4, 10, 'beginner', 0, 3, 2),
  (21, 9, 'running', 'Marche rapide du Plateau', 'Boucle de 6 km par les ruelles vertes. Rythme soutenu mais on jase.', 1, 12, 15, 60, 'Métro Mont-Royal', '465 av. du Mont-Royal E., Montréal', 45.5246, -73.5818, 2, 10, 'all', 0, null, 2),
  (22, 10, 'badminton', 'Badminton au centre Jean-Claude-Malépart', 'Trois terrains réservés. Volants fournis.', 3, 20, 0, 90, 'Centre Jean-Claude-Malépart', '2633 rue Ontario E., Montréal', 45.5310, -73.5480, 4, 8, 'all', 400, null, 7),
  -- Passées (historique pour la fiabilité et les avis)
  (101, 1, 'basketball', 'Basket du jeudi — 5 contre 5', 'Session passée.', -7, 18, 30, 90, 'Parc La Fontaine', '3933 av. du Parc-La Fontaine, Montréal', 45.5277, -73.5695, 6, 12, 'intermediate', 0, 2, 10),
  (102, 2, 'running', 'Course du canal Lachine — 8 km', 'Session passée.', -6, 6, 30, 60, 'Marché Atwater', '138 av. Atwater, Montréal', 45.4807, -73.5772, 2, 25, 'all', 0, 1, 12),
  (103, 3, 'board-games', 'Soirée jeux : Splendor et Carcassonne', 'Session passée.', -5, 19, 0, 180, 'Café Ludik', '1215 rue Wellington, Montréal', 45.4925, -73.5605, 4, 12, 'beginner', 800, 3, 9),
  (104, 1, 'basketball', 'Basket du jeudi — 5 contre 5', 'Session passée.', -14, 18, 30, 90, 'Parc La Fontaine', '3933 av. du Parc-La Fontaine, Montréal', 45.5277, -73.5695, 6, 12, 'intermediate', 0, 2, 10),
  (105, 2, 'running', 'Course du canal Lachine — 8 km', 'Session passée.', -13, 6, 30, 60, 'Marché Atwater', '138 av. Atwater, Montréal', 45.4807, -73.5772, 2, 25, 'all', 0, 1, 11),
  (106, 4, 'pickleball', 'Pickleball au Vieux-Port', 'Session passée.', -3, 10, 0, 90, 'Quai de l''Horloge', 'Quai de l''Horloge, Vieux-Port de Montréal', 45.5105, -73.5469, 4, 8, 'all', 1200, null, 8);

-- Insertion des sessions (UUID déterministes : c3…<n>)
insert into public.sessions (id, host_id, group_id, category_id, title, description, starts_at, ends_at, venue_name, address, location, city_id,
  min_players, max_players, level, price_cents, status)
select
  ('c3000000-0000-4000-8000-' || lpad(d.n::text, 12, '0'))::uuid,
  ('a1000000-0000-4000-8000-' || lpad(d.host::text, 12, '0'))::uuid,
  case when d.grp is not null then ('b2000000-0000-4000-8000-' || lpad(d.grp::text, 12, '0'))::uuid end,
  c.id, d.title, d.descr,
  start_ts, start_ts + make_interval(mins => d.dur),
  d.venue, d.address, extensions.st_point(d.lng, d.lat, 4326)::extensions.geography,
  (select id from public.cities where slug = 'montreal'),
  d.min_p, d.max_p, d.lvl::public.session_level, d.price,
  case when d.n > 100 then 'completed'::public.session_status else 'published'::public.session_status end
from demo_sessions d
join public.categories c on c.slug = d.cat
cross join lateral (
  -- Heure murale de Montréal du jour J + offset ; si « ce soir » est déjà passé, on décale d'un jour
  select case
    when (date_trunc('day', now() at time zone 'America/Toronto') + make_interval(days => d.day_offset, hours => d.hh, mins => d.mm)) at time zone 'America/Toronto' < now() + interval '1 hour'
         and d.n < 100
      then (date_trunc('day', now() at time zone 'America/Toronto') + make_interval(days => d.day_offset + 1, hours => d.hh, mins => d.mm)) at time zone 'America/Toronto'
    else (date_trunc('day', now() at time zone 'America/Toronto') + make_interval(days => d.day_offset, hours => d.hh, mins => d.mm)) at time zone 'America/Toronto'
  end as start_ts
) t;

-- Participants : l'organisateur + (joined - 1) personnes, sans dépasser max_players
insert into public.session_participants (session_id, user_id, status, joined_at)
select s.id, s.host_id, case when s.status = 'completed' then 'attended'::public.participant_status else 'joined' end, s.created_at - interval '3 days'
from public.sessions s where s.id::text like 'c3000000-%';

insert into public.session_participants (session_id, user_id, status, joined_at)
select s.id, p.id,
  case
    when s.status = 'completed' and (abs(hashtext(s.id::text || p.id::text)) % 10) = 0 then 'no_show'::public.participant_status
    when s.status = 'completed' then 'attended'::public.participant_status
    else 'joined'::public.participant_status
  end,
  now() - make_interval(hours => (abs(hashtext(s.id::text || p.id::text)) % 72) + 1)
from public.sessions s
join demo_sessions d on ('c3000000-0000-4000-8000-' || lpad(d.n::text, 12, '0'))::uuid = s.id
cross join lateral (
  select pr.id from public.profiles pr
  where pr.id::text like 'a1000000-%' and pr.id <> s.host_id
  order by hashtext(pr.id::text || s.id::text)
  limit least(d.joined, s.max_players) - 1
) p;

-- Une liste d'attente sur la session complète de pickleball
insert into public.session_participants (session_id, user_id, status, joined_at)
select 'c3000000-0000-4000-8000-000000000004'::uuid, pr.id, 'waitlist', now() - interval '30 minutes'
from public.profiles pr
where pr.id::text like 'a1000000-%'
  and not exists (select 1 from public.session_participants sp where sp.session_id = 'c3000000-0000-4000-8000-000000000004'::uuid and sp.user_id = pr.id)
order by pr.id limit 2;

-- Avis sur les sessions passées
insert into public.reviews (session_id, reviewer_id, reviewed_id, rating, tags)
select a.session_id, a.user_id, b.user_id, 1,
  case abs(hashtext(a.user_id::text || b.user_id::text)) % 4
    when 0 then array['punctual', 'friendly'] when 1 then array['fairplay']
    when 2 then array['friendly', 'skilled'] else array['organized', 'punctual'] end
from public.session_participants a
join public.session_participants b on b.session_id = a.session_id and b.user_id <> a.user_id
where a.status = 'attended' and b.status = 'attended'
  and a.session_id::text like 'c3000000-%'
  and abs(hashtext(a.user_id::text || b.user_id::text || a.session_id::text)) % 4 = 0;

-- Messages dans quelques chats
insert into public.messages (session_id, user_id, body, created_at) values
  ('c3000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'Je réserve le terrain du fond, celui avec les filets neufs.', now() - interval '5 hours'),
  ('c3000000-0000-4000-8000-000000000001', (select user_id from public.session_participants where session_id = 'c3000000-0000-4000-8000-000000000001' and user_id <> 'a1000000-0000-4000-8000-000000000001' order by joined_at limit 1), 'Parfait, j''amène un deuxième ballon.', now() - interval '4 hours'),
  ('c3000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'Il annonce 4 °C demain matin, couche-toi tôt et habille-toi en pelures d''oignon.', now() - interval '2 hours'),
  ('c3000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', 'J''apporte aussi Wingspan si ça tente quelqu''un.', now() - interval '1 day');

insert into public.messages (group_id, user_id, body, created_at) values
  ('b2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 'Bienvenue aux nouveaux. On part à 6 h 30 pile, pas d''attente.', now() - interval '3 days'),
  ('b2000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'Jeudi : si ça pleut, on bascule au gymnase de l''école Saint-Louis.', now() - interval '1 day');

-- Recalcule les compteurs (les insertions directes passent par le trigger, mais on s'assure de l'état final)
select public.refresh_session_counts(id) from public.sessions;
drop table demo_sessions;
