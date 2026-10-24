-- Métriques produit calculées à la source (schéma `metrics`, non exposé par l'API : service / tableau de bord seulement).
-- Complète PostHog : remplissage et présence réels viennent de la base, pas d'événements client.
create schema if not exists metrics;
revoke all on schema metrics from public, anon, authenticated;

-- Par semaine (lundi, heure de Montréal) et par ville
create or replace view metrics.weekly as
with s as (
  select
    date_trunc('week', s.starts_at at time zone 'America/Toronto')::date as week,
    s.city_id, s.id, s.host_id, s.max_players, s.places_taken, s.status
  from public.sessions s
  where s.status in ('published', 'completed')
)
select
  week,
  city_id,
  count(*) as sessions_published,
  count(distinct host_id) as active_hosts,
  round(100.0 * avg(least(places_taken, max_players)::numeric / max_players), 1) as fill_rate_pct, -- cible ≥ 60 %
  round(100.0 * (
    select count(*) filter (where sp.status = 'attended')::numeric / nullif(count(*) filter (where sp.status in ('attended', 'no_show')), 0)
    from public.session_participants sp where sp.session_id in (select id from s s2 where s2.week = s.week and s2.city_id = s.city_id)
  ), 1) as attendance_rate_pct -- cible ≥ 80 %
from s
group by week, city_id
order by week desc;

-- Activation 48 h et rétention 14 j, par cohorte d'inscription (semaine)
create or replace view metrics.cohorts as
with u as (
  select p.id, p.created_at, date_trunc('week', p.created_at at time zone 'America/Toronto')::date as cohort
  from public.profiles p where p.terms_accepted_at is not null
),
firsts as (
  select u.id, u.cohort, u.created_at,
    (select min(sp.joined_at) from public.session_participants sp where sp.user_id = u.id) as first_join,
    (select min(s.created_at) from public.sessions s where s.host_id = u.id) as first_host
  from u
),
second as (
  select f.*, (
    select count(distinct sp.session_id) from public.session_participants sp
    where sp.user_id = f.id and sp.status in ('joined', 'attended', 'no_show') and sp.joined_at <= f.first_join + interval '14 days'
  ) as joins_14d
  from firsts f
)
select
  cohort,
  count(*) as signups,
  round(100.0 * count(*) filter (where least(first_join, first_host) <= created_at + interval '48 hours') / nullif(count(*), 0), 1) as activation_48h_pct, -- cible ≥ 35 %
  round(100.0 * count(*) filter (where joins_14d >= 2) / nullif(count(*) filter (where first_join is not null), 0), 1) as second_session_14d_pct -- cible ≥ 40 %
from second
group by cohort
order by cohort desc;

grant usage on schema metrics to service_role;
grant select on all tables in schema metrics to service_role;
