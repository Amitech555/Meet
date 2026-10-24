-- Ajouter / retirer son invité (+1) après inscription. Même verrou que join_session.
create or replace function public.set_guest(p_session_id uuid, p_guest boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_ready_user();
  s public.sessions;
  me public.session_participants;
  taken integer;
begin
  select * into s from public.sessions where id = p_session_id for update;
  if not found or s.status <> 'published' then
    raise exception 'session_unavailable' using errcode = 'P0001';
  end if;
  if s.starts_at <= now() then
    raise exception 'session_started' using errcode = 'P0001';
  end if;
  select * into me from public.session_participants where session_id = p_session_id and user_id = uid;
  if me.status is distinct from 'joined' then
    raise exception 'not_joined' using errcode = 'P0001';
  end if;

  if p_guest and me.guest_count = 0 then
    select coalesce(sum(1 + guest_count), 0) into taken
    from public.session_participants where session_id = p_session_id and status = 'joined';
    if taken + 1 > s.max_players then
      raise exception 'session_full' using errcode = 'P0001';
    end if;
    update public.session_participants set guest_count = 1 where session_id = p_session_id and user_id = uid;
  elsif not p_guest and me.guest_count > 0 then
    update public.session_participants set guest_count = 0 where session_id = p_session_id and user_id = uid;
    perform public.promote_waitlist(p_session_id);
  end if;

  return jsonb_build_object('guest_count', case when p_guest then 1 else 0 end,
                            'places_taken', (select places_taken from public.sessions where id = p_session_id));
end $$;

revoke execute on function public.set_guest(uuid, boolean) from public, anon;
grant execute on function public.set_guest(uuid, boolean) to authenticated;
