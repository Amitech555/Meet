-- Partants — rappels automatiques et envoi des notifications push.
-- enqueue_reminders() crée les notifications (idempotent grâce à l'index unique) ;
-- l'Edge Function send-push les envoie via l'API Expo et remplit pushed_at.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function public.enqueue_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer := 0;
  c integer;
begin
  -- Veille : sessions qui commencent dans 23 h 30 à 24 h 30
  insert into public.notifications (user_id, kind, session_id, payload)
  select sp.user_id, 'reminder_24h', s.id, jsonb_build_object('title', s.title, 'starts_at', s.starts_at, 'venue', s.venue_name)
  from public.sessions s
  join public.session_participants sp on sp.session_id = s.id and sp.status = 'joined'
  where s.status = 'published'
    and s.starts_at between now() + interval '23 hours 30 minutes' and now() + interval '24 hours 30 minutes'
  on conflict do nothing;
  get diagnostics c = row_count; n := n + c;

  -- 2 h avant
  insert into public.notifications (user_id, kind, session_id, payload)
  select sp.user_id, 'reminder_2h', s.id, jsonb_build_object('title', s.title, 'starts_at', s.starts_at, 'venue', s.venue_name)
  from public.sessions s
  join public.session_participants sp on sp.session_id = s.id and sp.status = 'joined'
  where s.status = 'published'
    and s.starts_at between now() + interval '1 hour 45 minutes' and now() + interval '2 hours 15 minutes'
  on conflict do nothing;
  get diagnostics c = row_count; n := n + c;

  -- Appel : 15 min après la fin, à l'organisateur, tant que la session n'est pas pointée
  insert into public.notifications (user_id, kind, session_id, payload)
  select s.host_id, 'checkin', s.id, jsonb_build_object('title', s.title)
  from public.sessions s
  where s.status = 'published' and s.host_id is not null
    and s.ends_at between now() - interval '6 hours' and now() - interval '15 minutes'
  on conflict do nothing;
  get diagnostics c = row_count; n := n + c;

  -- Session passée non pointée après 3 jours : on la clôt sans toucher à la fiabilité
  update public.sessions set status = 'completed'
  where status = 'published' and ends_at < now() - interval '3 days';

  return n;
end $$;

revoke execute on function public.enqueue_reminders() from public, anon, authenticated;

-- Notifications lues : marquer tout comme lu
create or replace function public.mark_notifications_read()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications set read_at = now() where user_id = auth.uid() and read_at is null
$$;
revoke execute on function public.mark_notifications_read() from public, anon;
grant execute on function public.mark_notifications_read() to authenticated;

-- Liste des notifications avec la session liée
create or replace function public.list_notifications(p_limit integer default 50)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', n.id, 'kind', n.kind, 'payload', n.payload, 'created_at', n.created_at, 'read_at', n.read_at,
    'session_id', n.session_id
  ) order by n.created_at desc), '[]'::jsonb)
  from (select * from public.notifications where user_id = auth.uid() order by created_at desc limit least(p_limit, 100)) n
$$;
revoke execute on function public.list_notifications(integer) from public, anon;
grant execute on function public.list_notifications(integer) to authenticated;

-- Planification : rappels toutes les 10 minutes
select cron.schedule('partants-reminders', '*/10 * * * *', $$ select public.enqueue_reminders() $$);

-- Envoi push chaque minute via l'Edge Function, seulement si les secrets existent dans Vault
-- (en prod : select vault.create_secret('<url projet>', 'project_url'); select vault.create_secret('<service key>', 'service_role_key');)
select cron.schedule(
  'partants-send-push',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-push',
    headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'), 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'project_url')
  $$
);
