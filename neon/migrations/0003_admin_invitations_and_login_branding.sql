-- Acesso fechado por convite e personalização da página pública de login.

alter table public.organizations
  add column if not exists brand_login_banner_url text,
  add column if not exists brand_login_kicker text,
  add column if not exists brand_login_headline text,
  add column if not exists brand_login_description text;

alter table public.organization_members
  add column if not exists email text;

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.app_role not null default 'recruiter',
  token_hash text not null unique,
  invited_by text not null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists organization_invitations_pending_email_idx
  on public.organization_invitations (organization_id, lower(email))
  where accepted_at is null;

create index if not exists organization_invitations_org_status_idx
  on public.organization_invitations (organization_id, accepted_at, expires_at desc);

create index if not exists organization_invitations_token_hash_idx
  on public.organization_invitations (token_hash);
