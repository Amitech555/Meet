-- Partants — Row Level Security (activée sur TOUTES les tables) et privilèges.
-- Principe : lecture publique minimale, écriture uniquement par le propriétaire ou via RPC SECURITY DEFINER.

alter table public.cities enable row level security;
alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.user_interests enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.sessions enable row level security;
alter table public.session_participants enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.saved_sessions enable row level security;
alter table public.follows enable row level security;
alter table public.push_tokens enable row level security;
alter table public.notifications enable row level security;
alter table public.platform_settings enable row level security;

-- Référentiels : lecture pour tous -----------------------------------------------
create policy "cities: lecture publique" on public.cities for select to anon, authenticated using (true);
create policy "categories: lecture publique" on public.categories for select to anon, authenticated using (is_active);
create policy "settings: lecture publique" on public.platform_settings for select to anon, authenticated using (true);

-- Profils : chacun lit et modifie le sien ; les autres passent par get_profile() (champs publics) --
create policy "profiles: lire le sien" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profiles: modifier le sien" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "interests: les siens" on public.user_interests for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Sessions : on lit les sessions visibles ; on ne modifie que les siennes ------------
create policy "sessions: lecture des sessions visibles" on public.sessions for select to anon, authenticated
  using (public.can_view_session(id, (select auth.uid())));
create policy "sessions: l'organisateur modifie la sienne" on public.sessions for update to authenticated
  using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()));
create policy "sessions: l'organisateur supprime un brouillon" on public.sessions for delete to authenticated
  using (host_id = (select auth.uid()) and status = 'draft');
-- Pas de policy INSERT : création via create_session() uniquement.

-- Participants : je vois mes inscriptions et celles des sessions dont je suis membre ----------
create policy "participants: lecture membres" on public.session_participants for select to authenticated
  using (user_id = (select auth.uid()) or public.is_session_member(session_id, (select auth.uid())));
-- Pas d'écriture directe : join_session / leave_session / record_attendance.

-- Messages : lisibles et écrits seulement par les participants (session) ou membres (groupe) ---
create policy "messages: lecture membres" on public.messages for select to authenticated
  using (
    (session_id is not null and public.is_session_member(session_id, (select auth.uid())))
    or (group_id is not null and public.is_group_member(group_id, (select auth.uid())))
  );
create policy "messages: écrire en son nom si membre" on public.messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and deleted_at is null
    and not exists (select 1 from public.profiles p where p.id = (select auth.uid()) and (p.is_banned or p.terms_accepted_at is null))
    and (
      (session_id is not null and public.is_session_member(session_id, (select auth.uid()))
        and exists (select 1 from public.sessions s where s.id = session_id and s.status <> 'draft'))
      or (group_id is not null and public.is_group_member(group_id, (select auth.uid())))
    )
  );
-- Suppression : delete_message() (douce, avec modération organisateur/admin).

-- Avis : je ne vois que ceux que j'ai donnés ; les agrégats publics passent par get_profile() ---
create policy "reviews: les miens" on public.reviews for select to authenticated using (reviewer_id = (select auth.uid()));

-- Signalements : j'en crée en mon nom, je vois les miens -----------------------------
create policy "reports: créer" on public.reports for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy "reports: les miens" on public.reports for select to authenticated using (reporter_id = (select auth.uid()));

-- Blocages ----------------------------------------------------------------------
create policy "blocks: les miens" on public.blocks for all to authenticated
  using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));

-- Groupes -----------------------------------------------------------------------
create policy "groups: lecture publics ou membre" on public.groups for select to anon, authenticated
  using (visibility = 'public' or public.is_group_member(id, (select auth.uid())));
create policy "groups: créer en son nom" on public.groups for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.terms_accepted_at is not null and not p.is_banned)
  );
create policy "groups: admins modifient" on public.groups for update to authenticated
  using (public.is_group_admin(id, (select auth.uid()))) with check (public.is_group_admin(id, (select auth.uid())));
create policy "groups: le propriétaire supprime" on public.groups for delete to authenticated using (owner_id = (select auth.uid()));

create policy "group_members: lecture si groupe visible" on public.group_members for select to authenticated
  using (public.is_group_member(group_id, (select auth.uid()))
      or exists (select 1 from public.groups g where g.id = group_id and g.visibility = 'public'));
create policy "group_members: un admin retire un membre" on public.group_members for delete to authenticated
  using (public.is_group_admin(group_id, (select auth.uid())) and user_id <> (select auth.uid()));
-- Rejoindre / quitter : join_group() / leave_group().

-- Données personnelles ----------------------------------------------------------
create policy "saved: les miens" on public.saved_sessions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "follows: les miens" on public.follows for all to authenticated
  using (follower_id = (select auth.uid())) with check (follower_id = (select auth.uid()));
create policy "push_tokens: les miens" on public.push_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications: lire les miennes" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: marquer lues" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Privilèges par colonne : ce qu'un utilisateur peut modifier directement ------------
revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_url, bio, city_id, locale) on public.profiles to authenticated;

revoke update on public.sessions from anon, authenticated;
grant update (title, description, venue_name, address, level, max_players, min_players, cover_url, cover_blurhash, cancellation_policy)
  on public.sessions to authenticated;

revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

revoke update on public.groups from anon, authenticated;
grant update (name, description, cover_url, rhythm_label, visibility) on public.groups to authenticated;

revoke insert, update, delete on public.session_participants, public.reviews, public.cities, public.categories, public.platform_settings
  from anon, authenticated;
revoke insert, update on public.group_members from anon, authenticated;
revoke update, delete on public.messages from anon, authenticated;
revoke all on public.reports, public.blocks, public.saved_sessions, public.follows, public.push_tokens from anon;

-- Fonctions : par défaut PUBLIC peut tout exécuter. On ferme, puis on ouvre la liste blanche. ---
revoke execute on all functions in schema public from public, anon, authenticated;

-- Lecture (anonyme autorisé : explorer sans compte)
grant execute on function
  public.feed_sessions(smallint, double precision, double precision, timestamptz, timestamptz, integer[], text, public.session_level[], integer, text, integer, timestamptz, uuid),
  public.sessions_within_radius(double precision, double precision, integer, integer),
  public.get_session(uuid, double precision, double precision),
  public.get_profile(uuid),
  public.get_group(uuid, text),
  public.list_groups(smallint, text),
  public.reliability_score(uuid)
to anon, authenticated;

-- Actions (compte requis)
grant execute on function
  public.get_me(),
  public.my_sessions(text, integer),
  public.my_past_hosted(integer),
  public.session_roster(uuid),
  public.list_messages(uuid, uuid, bigint, integer),
  public.complete_profile(text, date, text, smallint, integer[]),
  public.set_interests(integer[]),
  public.join_session(uuid, boolean),
  public.leave_session(uuid),
  public.join_series(uuid),
  public.create_session(integer, text, text, timestamptz, integer, text, text, double precision, double precision, smallint, smallint, public.session_level, integer, public.cancellation_policy, text, text, uuid, integer),
  public.duplicate_session(uuid, timestamptz),
  public.cancel_session(uuid, text),
  public.record_attendance(uuid, uuid[]),
  public.submit_reviews(uuid, jsonb),
  public.join_group(uuid, text),
  public.leave_group(uuid),
  public.delete_message(bigint),
  public.delete_my_account(),
  public.shares_session(uuid, uuid)
to authenticated;

-- Aides utilisées dans les policies (RLS les évalue avec les droits de l'appelant)
grant execute on function
  public.can_view_session(uuid, uuid),
  public.is_session_member(uuid, uuid),
  public.is_group_member(uuid, uuid),
  public.is_group_admin(uuid, uuid),
  public.f_unaccent(text)
to anon, authenticated;

-- Les fonctions futures ne sont pas exécutables par défaut
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- Realtime : chat et compteurs de places en direct (Realtime respecte la RLS) ---------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.sessions;

-- Storage : avatars et couvertures (lecture publique, écriture dans son dossier) -------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('covers', 'covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "storage: lecture publique avatars/couvertures" on storage.objects for select to anon, authenticated
  using (bucket_id in ('avatars', 'covers'));
create policy "storage: déposer dans son dossier" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'covers') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "storage: remplacer dans son dossier" on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'covers') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "storage: supprimer dans son dossier" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'covers') and (storage.foldername(name))[1] = (select auth.uid())::text);
