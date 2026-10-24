-- Partants — Phase 2 : paiements Stripe Connect Express (schéma prêt, fonctionnalité coupée).
-- Activation : platform_settings.payments_enabled = true + Edge Functions stripe-* déployées.

create table public.payout_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  stripe_account_id text not null unique,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete restrict,
  user_id uuid references public.profiles (id) on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  platform_fee_cents integer not null check (platform_fee_cents >= 0),
  currency char(3) not null default 'CAD',
  stripe_payment_intent_id text unique,
  stripe_refund_id text,
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_session_idx on public.payments (session_id);
create index payments_user_idx on public.payments (user_id, created_at desc);

create trigger payout_accounts_touch before update on public.payout_accounts
  for each row execute function public.touch_updated_at();
create trigger payments_touch before update on public.payments
  for each row execute function public.touch_updated_at();

alter table public.payout_accounts enable row level security;
alter table public.payments enable row level security;

-- Lecture de ses propres données ; écritures uniquement par le service (webhooks Stripe).
create policy "payout_accounts: le mien" on public.payout_accounts for select to authenticated using (user_id = (select auth.uid()));
create policy "payments: les miens" on public.payments for select to authenticated
  using (user_id = (select auth.uid()) or exists (select 1 from public.sessions s where s.id = session_id and s.host_id = (select auth.uid())));
revoke insert, update, delete on public.payout_accounts, public.payments from anon, authenticated;

-- Réglages et drapeaux côté serveur (les flags d'UI vivent aussi dans PostHog)
insert into public.platform_settings (key, value) values
  ('commission_bps', '1000'),            -- 10 % de commission plateforme
  ('payments_enabled', 'false'),
  ('terms_version', '"2026-10-24"'),
  ('p2_features_enabled', 'false')
on conflict (key) do nothing;
