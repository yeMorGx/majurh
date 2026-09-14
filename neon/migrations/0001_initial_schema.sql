-- Vieira Couto RH — esquema inicial para Neon Postgres.
-- A autenticação é gerenciada pelo Neon Auth. Os IDs de usuário são text
-- para acompanhar o formato do Better Auth; os IDs dos registros do RH são uuid.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('admin', 'recruiter', 'viewer');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.process_status as enum (
    'new', 'screening', 'interview', 'evaluation', 'approved', 'documentation',
    'admission', 'hired', 'rejected', 'withdrawn', 'talent_pool'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.candidate_source as enum (
    'linkedin', 'indeed', 'referral', 'whatsapp', 'talent_pool', 'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.reapplication_decision as enum ('yes', 'no', 'review');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.document_type as enum (
    'rg', 'cpf', 'cnh', 'proof_of_address', 'work_card', 'resume', 'certificate', 'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.document_status as enum (
    'pending', 'uploaded', 'in_review', 'approved', 'rejected', 'request_again'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.withdrawal_reason_code as enum (
    'other_offer', 'salary', 'schedule', 'location', 'benefits', 'personal',
    'no_response', 'no_reason_informed', 'other'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id text primary key,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Relação temporária para preservar o vínculo com usuários migrados do Supabase.
-- O login continua sendo gerenciado pelo Neon Auth; este catálogo só mapeia o e-mail legado.
create table if not exists public.legacy_auth_users (
  id text primary key,
  email text not null unique,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id text not null,
  role public.app_role not null default 'recruiter',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id),
  unique (organization_id, id)
);

create table if not exists public.vacancies (
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

create table if not exists public.candidates (
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
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, cpf_normalized),
  unique (organization_id, id)
);

create table if not exists public.recruitment_processes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  candidate_id uuid not null,
  vacancy_id uuid,
  responsible_user_id text,
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
    references public.candidates(organization_id, id) on delete cascade,
  foreign key (organization_id, vacancy_id)
    references public.vacancies(organization_id, id) on delete set null,
  check (status <> 'withdrawn' or withdrawal_reason_code is not null)
);

create table if not exists public.candidate_documents (
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
  uploaded_by text,
  reviewed_by text,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, candidate_id)
    references public.candidates(organization_id, id) on delete cascade,
  foreign key (organization_id, process_id)
    references public.recruitment_processes(organization_id, id) on delete set null
);

create table if not exists public.process_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  process_id uuid not null,
  actor_user_id text,
  action text not null,
  old_status public.process_status,
  new_status public.process_status,
  notes text,
  created_at timestamptz not null default now(),
  foreign key (organization_id, process_id)
    references public.recruitment_processes(organization_id, id) on delete cascade
);

create index if not exists organization_members_user_org_idx
  on public.organization_members (user_id, organization_id);
create index if not exists vacancies_org_active_idx
  on public.vacancies (organization_id, is_active);
create index if not exists candidates_org_name_idx
  on public.candidates (organization_id, lower(full_name));
create index if not exists candidates_org_phone_idx
  on public.candidates (organization_id, phone);
create index if not exists candidates_org_email_idx
  on public.candidates (organization_id, lower(email));
create index if not exists processes_org_status_idx
  on public.recruitment_processes (organization_id, status);
create index if not exists processes_org_candidate_idx
  on public.recruitment_processes (organization_id, candidate_id);
create index if not exists processes_org_started_idx
  on public.recruitment_processes (organization_id, started_at desc);
create index if not exists documents_org_candidate_idx
  on public.candidate_documents (organization_id, candidate_id);
create index if not exists documents_org_status_idx
  on public.candidate_documents (organization_id, status);
create index if not exists history_org_process_created_idx
  on public.process_history (organization_id, process_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at before update on public.organizations
for each row execute function public.set_updated_at();
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists vacancies_set_updated_at on public.vacancies;
create trigger vacancies_set_updated_at before update on public.vacancies
for each row execute function public.set_updated_at();
drop trigger if exists candidates_set_updated_at on public.candidates;
create trigger candidates_set_updated_at before update on public.candidates
for each row execute function public.set_updated_at();
drop trigger if exists processes_set_updated_at on public.recruitment_processes;
create trigger processes_set_updated_at before update on public.recruitment_processes
for each row execute function public.set_updated_at();
drop trigger if exists documents_set_updated_at on public.candidate_documents;
create trigger documents_set_updated_at before update on public.candidate_documents
for each row execute function public.set_updated_at();

create or replace function public.sync_candidate_cpf()
returns trigger language plpgsql as $$
begin
  new.cpf_normalized := regexp_replace(coalesce(new.cpf, ''), '[^0-9]', '', 'g');
  return new;
end;
$$;

drop trigger if exists candidates_sync_cpf on public.candidates;
create trigger candidates_sync_cpf before insert or update of cpf, cpf_normalized
on public.candidates for each row execute function public.sync_candidate_cpf();

create or replace function public.validate_document_process_context()
returns trigger language plpgsql as $$
begin
  if new.process_id is not null and not exists (
    select 1 from public.recruitment_processes process
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

drop trigger if exists documents_validate_process_context on public.candidate_documents;
create trigger documents_validate_process_context
before insert or update of organization_id, candidate_id, process_id
on public.candidate_documents for each row execute function public.validate_document_process_context();
