-- Autenticação própria do projeto majurh-admin.
-- O admin não compartilha senhas nem sessões com o Majurh operacional.

alter table public.site_admins
  add column if not exists password_hash text;

create table if not exists public.site_admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id text not null references public.site_admins(user_id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists site_admin_sessions_active_idx
  on public.site_admin_sessions (token_hash, expires_at);

comment on table public.site_admin_sessions is
  'Sessões exclusivas do projeto majurh-admin; não são sessões do Majurh operacional.';
