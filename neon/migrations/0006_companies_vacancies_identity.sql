-- Empresas contratantes, volume de contratação e identificação RG/CIN.

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 160),
  legal_name text,
  cnpj text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create unique index if not exists companies_org_name_idx
  on public.companies (organization_id, lower(name));
create index if not exists companies_org_active_idx
  on public.companies (organization_id, is_active, lower(name));

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at before update on public.companies
for each row execute function public.set_updated_at();

alter table public.vacancies
  add column if not exists quantity integer not null default 1,
  add column if not exists company_id uuid;

do $$ begin
  alter table public.vacancies
    add constraint vacancies_quantity_positive check (quantity > 0);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.vacancies
    add constraint vacancies_company_fk
    foreign key (organization_id, company_id)
    references public.companies(organization_id, id)
    on delete set null;
exception when duplicate_object then null;
end $$;

create index if not exists vacancies_org_company_idx
  on public.vacancies (organization_id, company_id);

alter table public.candidates
  add column if not exists identity_document_type text not null default 'rg';

do $$ begin
  alter table public.candidates
    add constraint candidates_identity_document_type_check
    check (identity_document_type in ('rg', 'cin'));
exception when duplicate_object then null;
end $$;

alter type public.document_type add value if not exists 'cin';
