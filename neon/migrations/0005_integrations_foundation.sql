-- Base multi-tenant para integrações de recrutamento.
-- Segredos ficam criptografados no servidor; nunca são expostos ao cliente.

alter type public.candidate_source add value if not exists 'catho';
alter type public.candidate_source add value if not exists 'solides';

create table if not exists public.organization_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('catho', 'solides', 'linkedin', 'indeed')),
  status text not null default 'disconnected'
    check (status in ('disconnected', 'pending', 'connected', 'error')),
  external_account_id text,
  credentials_ciphertext text,
  credentials_updated_at timestamptz,
  last_sync_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create index if not exists organization_integrations_org_status_idx
  on public.organization_integrations (organization_id, status);

drop trigger if exists organization_integrations_set_updated_at on public.organization_integrations;
create trigger organization_integrations_set_updated_at before update on public.organization_integrations
for each row execute function public.set_updated_at();
