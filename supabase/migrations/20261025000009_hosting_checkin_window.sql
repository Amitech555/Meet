-- Correctif : « J'organise » perdait les sessions passées de plus de 24 h encore à pointer.
-- Les organisateurs ont 14 jours pour faire l'appel (record_attendance) : la liste suit la même fenêtre.

-- Mes sessions : upcoming | past | hosting
create or replace function public.my_sessions(p_kind text, p_limit integer default 50)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with rows as (
    select s.*
    from public.sessions s
    where auth.uid() is not null
      and case p_kind
        -- À venir, ou commencée il y a moins de 14 jours et pas encore pointée (l'appel reste possible 14 jours)
        when 'hosting' then s.host_id = auth.uid() and s.status <> 'draft'
          and (s.ends_at > now() or (s.status = 'published' and s.starts_at > now() - interval '14 days'))
        when 'upcoming' then s.ends_at > now() and s.status in ('published', 'cancelled')
          and exists (select 1 from public.session_participants sp where sp.session_id = s.id and sp.user_id = auth.uid() and sp.status in ('joined', 'waitlist'))
        when 'past' then s.ends_at <= now() and s.status <> 'cancelled'
          and exists (select 1 from public.session_participants sp where sp.session_id = s.id and sp.user_id = auth.uid() and sp.status in ('joined', 'attended', 'no_show'))
        else false
      end
    order by case when p_kind = 'past' then extract(epoch from s.starts_at) * -1 else extract(epoch from s.starts_at) end
    limit least(p_limit, 100)
  )
  select coalesce(jsonb_agg(
    public.session_card_json(r) || jsonb_build_object(
      'needs_checkin', r.host_id = auth.uid() and r.starts_at <= now() and r.status = 'published',
      'needs_review', p_kind = 'past' and r.starts_at > now() - interval '14 days'
        and not exists (select 1 from public.reviews rv where rv.session_id = r.id and rv.reviewer_id = auth.uid())
        and exists (select 1 from public.session_participants sp where sp.session_id = r.id and sp.user_id = auth.uid() and sp.status = 'attended')
    )
    order by case when p_kind = 'past' then extract(epoch from r.starts_at) * -1 else extract(epoch from r.starts_at) end
  ), '[]'::jsonb)
  from rows r
$$;
