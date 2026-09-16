-- Administradores globais do Majurh.
-- Acesso ao console administrativo não depende de vínculo com uma organização.
create table if not exists public.site_admins (
  user_id text primary key,
  email text not null,
  full_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists site_admins_email_lower_idx
  on public.site_admins (lower(email));

comment on table public.site_admins is
  'Contas com acesso global ao console separado de administração do Majurh.';
