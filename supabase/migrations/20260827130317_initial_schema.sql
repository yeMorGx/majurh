-- Vieira Couto RH — schema inicial do MVP
-- Dados sensíveis ficam no schema public protegido por RLS.
-- Documentos ficam em bucket privado com políticas próprias em storage.objects.

create schema if not exists private;

create type public.app_role as enum ('admin', 'recruiter', 'viewer');
create type public.process_status as enum (
  'new',
  'screening',
  'interview',
  'evaluation',
  'approved',
  'documentation',
  'admission',
  'hired',
  'rejected',
  'withdrawn',
  'talent_pool'
);
create type public.candidate_source as enum (
  'linkedin',
  'indeed',
  'referral',
  'whatsapp',
  'talent_pool',
  'other'
);
create type public.reapplication_decision as enum ('yes', 'no', 'review');
create type public.document_type as enum (
  'rg',
  'cpf',
  'cnh',
  'proof_of_address',
  'work_card',
  'resume',
  'certificate',
  'other'
);
create type public.document_status as enum (
  'pending',
  'uploaded',
  'in_review',
  'approved',
  'rejected',
  'request_again'
);
create type public.withdrawal_reason_code as enum (
  'other_offer',
  'salary',
  'schedule',
  'location',
  'benefits',
  'personal',
  'no_response',
  'no_reason_informed',
  'other'
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'recruiter',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id),
  unique (organization_id, id)
);

create table public.vacancies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 120),
  department text,
  unit text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 160),
  cpf text not null check (char_length(btrim(cpf)) between 11 and 14),
  cpf_normalized text not null check (cpf_normalized ~ '^[0-9]{11}$'),
  rg text,
  birth_date date,
  phone text,
  email text,
  postal_code text,
  street text,
  address_number text,
  address_complement text,
  neighborhood text,
  city text,
  state text check (state is null or char_length(state) = 2),
  cnh_number text,
  cnh_category text,
  cnh_expires_at date,
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, cpf_normalized),
  unique (organization_id, id)
);

create table public.recruitment_processes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  candidate_id uuid not null,
  vacancy_id uuid,
  responsible_user_id uuid references auth.users(id),
  source public.candidate_source,
  status public.process_status not null default 'new',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  withdrawal_reason_code public.withdrawal_reason_code,
  withdrawal_notes text,
  can_apply_again public.reapplication_decision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, candidate_id)
    references public.candidates(organization_id, id)
    on delete cascade,
  foreign key (organization_id, vacancy_id)
    references public.vacancies(organization_id, id)
    on delete set null,
  check (
    status <> 'withdrawn'
    or withdrawal_reason_code is not null
  )
);

create table public.candidate_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  candidate_id uuid not null,
  process_id uuid,
  document_type public.document_type not null,
  status public.document_status not null default 'pending',
  storage_path text,
  original_name text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes > 0),
  uploaded_by uuid references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, candidate_id)
    references public.candidates(organization_id, id)
    on delete cascade,
  foreign key (organization_id, process_id)
    references public.recruitment_processes(organization_id, id)
    on delete set null
);

create table public.process_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  process_id uuid not null,
  actor_user_id uuid references auth.users(id),
  action text not null,
  old_status public.process_status,
  new_status public.process_status,
  notes text,
  created_at timestamptz not null default now(),
  foreign key (organization_id, process_id)
    references public.recruitment_processes(organization_id, id)
    on delete cascade
);

create index organization_members_user_org_idx
  on public.organization_members (user_id, organization_id);
create index vacancies_org_active_idx
  on public.vacancies (organization_id, is_active);
create index candidates_org_name_idx
  on public.candidates (organization_id, lower(full_name));
create index candidates_org_phone_idx
  on public.candidates (organization_id, phone);
create index candidates_org_email_idx
  on public.candidates (organization_id, lower(email));
create index processes_org_status_idx
  on public.recruitment_processes (organization_id, status);
create index processes_org_candidate_idx
  on public.recruitment_processes (organization_id, candidate_id);
create index processes_org_responsible_idx
  on public.recruitment_processes (organization_id, responsible_user_id);
create index processes_org_started_idx
  on public.recruitment_processes (organization_id, started_at desc);
create index documents_org_candidate_idx
  on public.candidate_documents (organization_id, candidate_id);
create index documents_org_status_idx
  on public.candidate_documents (organization_id, status);
create index history_org_process_created_idx
  on public.process_history (organization_id, process_id, created_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  new.created_at := old.created_at;
  return new;
end;
$$;

create or replace function private.sync_candidate_cpf()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.cpf_normalized := pg_catalog.regexp_replace(coalesce(new.cpf, ''), '[^0-9]', '', 'g');
  return new;
end;
$$;

create or replace function private.validate_document_process_context()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.process_id is not null and not exists (
    select 1
    from public.recruitment_processes process
    where process.id = new.process_id
      and process.organization_id = new.organization_id
      and process.candidate_id = new.candidate_id
  ) then
    raise exception 'O processo informado não pertence ao candidato e à organização do documento.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function private.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members member
    where member.organization_id = target_org
      and member.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_org_role(
  target_org uuid,
  allowed_roles public.app_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members member
    where member.organization_id = target_org
      and member.user_id = (select auth.uid())
      and member.role = any(allowed_roles)
  );
$$;

create or replace function private.can_manage_org(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_org_role(
    target_org,
    array['admin'::public.app_role, 'recruiter'::public.app_role]
  );
$$;

create or replace function private.can_admin_org(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_org_role(target_org, array['admin'::public.app_role]);
$$;

create or replace function private.can_view_profile(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user = (select auth.uid())
    or exists (
      select 1
      from public.organization_members viewer_member
      join public.organization_members subject_member
        on subject_member.organization_id = viewer_member.organization_id
      where viewer_member.user_id = (select auth.uid())
        and subject_member.user_id = target_user
    );
$$;

create or replace function private.org_id_from_storage_path(file_path text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  first_segment text;
begin
  first_segment := pg_catalog.split_part(file_path, '/', 1);
  if first_segment is null or first_segment = '' then
    return null;
  end if;

  begin
    return first_segment::uuid;
  exception when invalid_text_representation then
    return null;
  end;
end;
$$;

create or replace function private.can_access_storage_path(file_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_org_member(private.org_id_from_storage_path(file_path));
$$;

create or replace function private.can_manage_storage_path(file_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_manage_org(private.org_id_from_storage_path(file_path));
$$;

create or replace function private.log_process_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.process_history (
      organization_id,
      process_id,
      actor_user_id,
      action,
      old_status,
      new_status
    ) values (
      new.organization_id,
      new.id,
      (select auth.uid()),
      'process_created',
      null,
      new.status
    );
  elsif new.status is distinct from old.status then
    insert into public.process_history (
      organization_id,
      process_id,
      actor_user_id,
      action,
      old_status,
      new_status
    ) values (
      new.organization_id,
      new.id,
      (select auth.uid()),
      'status_changed',
      old.status,
      new.status
    );
  end if;

  return new;
end;
$$;

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function private.set_updated_at();
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger vacancies_set_updated_at
  before update on public.vacancies
  for each row execute function private.set_updated_at();
create trigger candidates_set_updated_at
  before update on public.candidates
  for each row execute function private.set_updated_at();
create trigger processes_set_updated_at
  before update on public.recruitment_processes
  for each row execute function private.set_updated_at();
create trigger documents_set_updated_at
  before update on public.candidate_documents
  for each row execute function private.set_updated_at();

create trigger candidates_sync_cpf
  before insert or update of cpf, cpf_normalized on public.candidates
  for each row execute function private.sync_candidate_cpf();

create trigger documents_validate_process_context
  before insert or update of organization_id, candidate_id, process_id
  on public.candidate_documents
  for each row execute function private.validate_document_process_context();

create trigger processes_log_status_change
  after insert or update of status on public.recruitment_processes
  for each row execute function private.log_process_status_change();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.vacancies enable row level security;
alter table public.candidates enable row level security;
alter table public.recruitment_processes enable row level security;
alter table public.candidate_documents enable row level security;
alter table public.process_history enable row level security;

revoke all on table public.organizations from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.organization_members from anon, authenticated;
revoke all on table public.vacancies from anon, authenticated;
revoke all on table public.candidates from anon, authenticated;
revoke all on table public.recruitment_processes from anon, authenticated;
revoke all on table public.candidate_documents from anon, authenticated;
revoke all on table public.process_history from anon, authenticated;

grant select, update on table public.organizations to authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.organization_members to authenticated;
grant select, insert, update, delete on table public.vacancies to authenticated;
grant select, insert, update, delete on table public.candidates to authenticated;
grant select, insert, update on table public.recruitment_processes to authenticated;
grant select, insert, update, delete on table public.candidate_documents to authenticated;
grant select on table public.process_history to authenticated;

grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, public.app_role[]) to authenticated;
grant execute on function private.can_manage_org(uuid) to authenticated;
grant execute on function private.can_admin_org(uuid) to authenticated;
grant execute on function private.can_view_profile(uuid) to authenticated;
grant execute on function private.org_id_from_storage_path(text) to authenticated;
grant execute on function private.can_access_storage_path(text) to authenticated;
grant execute on function private.can_manage_storage_path(text) to authenticated;
revoke all on function private.is_org_member(uuid) from public;
revoke all on function private.has_org_role(uuid, public.app_role[]) from public;
revoke all on function private.can_manage_org(uuid) from public;
revoke all on function private.can_admin_org(uuid) from public;
revoke all on function private.can_view_profile(uuid) from public;
revoke all on function private.org_id_from_storage_path(text) from public;
revoke all on function private.can_access_storage_path(text) from public;
revoke all on function private.can_manage_storage_path(text) from public;
revoke all on function private.log_process_status_change() from public;

create policy organizations_select_members
  on public.organizations for select to authenticated
  using ((select private.is_org_member(id)));

create policy organizations_update_admins
  on public.organizations for update to authenticated
  using ((select private.can_admin_org(id)))
  with check ((select private.can_admin_org(id)));

create policy profiles_select_colleagues
  on public.profiles for select to authenticated
  using ((select private.can_view_profile(id)));

create policy profiles_insert_self
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy profiles_update_self
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy organization_members_select_members
  on public.organization_members for select to authenticated
  using ((select private.is_org_member(organization_id)));

create policy organization_members_insert_admins
  on public.organization_members for insert to authenticated
  with check ((select private.can_admin_org(organization_id)));

create policy organization_members_update_admins
  on public.organization_members for update to authenticated
  using ((select private.can_admin_org(organization_id)))
  with check ((select private.can_admin_org(organization_id)));

create policy organization_members_delete_admins
  on public.organization_members for delete to authenticated
  using ((select private.can_admin_org(organization_id)));

create policy vacancies_select_members
  on public.vacancies for select to authenticated
  using ((select private.is_org_member(organization_id)));

create policy vacancies_insert_managers
  on public.vacancies for insert to authenticated
  with check ((select private.can_manage_org(organization_id)));

create policy vacancies_update_managers
  on public.vacancies for update to authenticated
  using ((select private.can_manage_org(organization_id)))
  with check ((select private.can_manage_org(organization_id)));

create policy vacancies_delete_admins
  on public.vacancies for delete to authenticated
  using ((select private.can_admin_org(organization_id)));

create policy candidates_select_members
  on public.candidates for select to authenticated
  using ((select private.is_org_member(organization_id)));

create policy candidates_insert_managers
  on public.candidates for insert to authenticated
  with check (
    (select private.can_manage_org(organization_id))
    and (select auth.uid()) = created_by
  );

create policy candidates_update_managers
  on public.candidates for update to authenticated
  using ((select private.can_manage_org(organization_id)))
  with check ((select private.can_manage_org(organization_id)));

create policy candidates_delete_admins
  on public.candidates for delete to authenticated
  using ((select private.can_admin_org(organization_id)));

create policy processes_select_members
  on public.recruitment_processes for select to authenticated
  using ((select private.is_org_member(organization_id)));

create policy processes_insert_managers
  on public.recruitment_processes for insert to authenticated
  with check ((select private.can_manage_org(organization_id)));

create policy processes_update_managers
  on public.recruitment_processes for update to authenticated
  using ((select private.can_manage_org(organization_id)))
  with check ((select private.can_manage_org(organization_id)));

create policy documents_select_members
  on public.candidate_documents for select to authenticated
  using ((select private.is_org_member(organization_id)));

create policy documents_insert_managers
  on public.candidate_documents for insert to authenticated
  with check ((select private.can_manage_org(organization_id)));

create policy documents_update_managers
  on public.candidate_documents for update to authenticated
  using ((select private.can_manage_org(organization_id)))
  with check ((select private.can_manage_org(organization_id)));

create policy documents_delete_managers
  on public.candidate_documents for delete to authenticated
  using ((select private.can_manage_org(organization_id)));

create policy history_select_members
  on public.process_history for select to authenticated
  using ((select private.is_org_member(organization_id)));

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'candidate-documents',
  'candidate-documents',
  false,
  6291456,
  array['application/pdf', 'image/jpeg', 'image/png']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy candidate_documents_storage_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'candidate-documents'
    and (select private.can_access_storage_path(name))
  );

create policy candidate_documents_storage_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'candidate-documents'
    and (select private.can_manage_storage_path(name))
  );

create policy candidate_documents_storage_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'candidate-documents'
    and (select private.can_manage_storage_path(name))
  );
