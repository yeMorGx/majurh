-- Presença operacional dos membros da organização.
-- O status é atualizado pelo app enquanto a pessoa está ativa; um status
-- online sem heartbeat recente é apresentado como offline pela API.

alter table public.organization_members
  add column if not exists presence_status text not null default 'offline',
  add column if not exists presence_updated_at timestamptz not null default now();

do $$ begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organization_members_presence_status_check'
      and conrelid = 'public.organization_members'::regclass
  ) then
    alter table public.organization_members
      add constraint organization_members_presence_status_check
      check (presence_status in ('online', 'offline', 'away', 'busy'));
  end if;
end $$;

create index if not exists organization_members_presence_idx
  on public.organization_members (organization_id, presence_status, presence_updated_at desc);
