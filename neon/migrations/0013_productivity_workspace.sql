-- Estado compartilhado das ferramentas de produtividade por organização.
-- O conteúdo é JSONB para manter o MVP flexível enquanto as entidades ganham
-- seus próprios históricos e permissões.

create table if not exists public.productivity_workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  board jsonb not null default '[]'::jsonb check (jsonb_typeof(board) = 'array'),
  tasks jsonb not null default '[]'::jsonb check (jsonb_typeof(tasks) = 'array'),
  events jsonb not null default '[]'::jsonb check (jsonb_typeof(events) = 'array'),
  ideas jsonb not null default '[]'::jsonb check (jsonb_typeof(ideas) = 'array'),
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists productivity_workspaces_updated_idx
  on public.productivity_workspaces (organization_id, updated_at desc);

drop trigger if exists productivity_workspaces_set_updated_at on public.productivity_workspaces;
create trigger productivity_workspaces_set_updated_at
before update on public.productivity_workspaces
for each row execute function public.set_updated_at();
