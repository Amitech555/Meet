-- Partants — extensions et types de base.
create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- unaccent() n'est pas IMMUTABLE ; ce wrapper l'est (dictionnaire figé) et permet de l'indexer.
create or replace function public.f_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

create type public.session_level as enum ('all', 'beginner', 'intermediate', 'advanced');
create type public.session_status as enum ('draft', 'published', 'cancelled', 'completed');
create type public.participant_status as enum ('joined', 'waitlist', 'cancelled', 'no_show', 'attended');
create type public.payment_status as enum ('none', 'pending', 'paid', 'refunded');
create type public.cancellation_policy as enum ('flexible', 'moderate', 'strict');
create type public.group_visibility as enum ('public', 'private');
create type public.group_role as enum ('admin', 'member');
create type public.report_target as enum ('user', 'session', 'group', 'message');
create type public.report_status as enum ('open', 'reviewed', 'actioned', 'dismissed');
