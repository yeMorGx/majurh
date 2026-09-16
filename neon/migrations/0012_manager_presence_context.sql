-- Papéis e contexto de presença para a operação da organização.

alter type public.app_role add value if not exists 'manager';

alter table public.organization_members
  add column if not exists presence_context text,
  add column if not exists presence_context_updated_at timestamptz;

create index if not exists organization_members_presence_context_idx
  on public.organization_members (organization_id, presence_context)
  where presence_context is not null;
