-- Onboarding de acesso geral: o administrador cria apenas as credenciais.
-- Nome, dados pessoais e organização são preenchidos pela própria pessoa.

alter table public.site_access_users
  alter column full_name drop not null;

alter table public.site_access_users
  drop constraint if exists site_access_users_full_name_check;

alter table public.site_access_users
  add constraint site_access_users_full_name_check
  check (full_name is null or char_length(btrim(full_name)) between 2 and 120);

alter table public.site_access_users
  add column if not exists must_change_password boolean not null default false,
  add column if not exists onboarding_completed_at timestamptz;

-- Acessos já existentes não devem voltar para o onboarding novo.
update public.site_access_users sau
set onboarding_completed_at = coalesce(sau.onboarding_completed_at, sau.created_at),
    must_change_password = false
where exists (select 1 from public.profiles p where p.id = sau.user_id);

create table if not exists public.user_onboarding_profiles (
  user_id text primary key,
  preferred_name text not null check (char_length(btrim(preferred_name)) between 2 and 120),
  birth_date date,
  phone text,
  avatar_path text,
  lead_source text not null check (lead_source in ('linkedin', 'referral', 'google', 'instagram', 'event', 'other')),
  referral_name text,
  primary_goal text not null check (primary_goal in ('organize_hr', 'documents_payroll', 'explore')),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_onboarding_referral_check check (lead_source <> 'referral' or char_length(btrim(coalesce(referral_name, ''))) between 2 and 120)
);

drop trigger if exists user_onboarding_profiles_set_updated_at on public.user_onboarding_profiles;
create trigger user_onboarding_profiles_set_updated_at
before update on public.user_onboarding_profiles
for each row execute function public.set_updated_at();

alter table public.organizations
  add column if not exists cnpj text,
  add column if not exists legal_name text,
  add column if not exists trade_name text,
  add column if not exists employee_range text,
  add column if not exists industry text,
  add column if not exists has_dedicated_hr boolean,
  add column if not exists initial_modules jsonb not null default '[]'::jsonb,
  add column if not exists implementation_preference text;

alter table public.organizations
  drop constraint if exists organizations_employee_range_check,
  drop constraint if exists organizations_industry_check,
  drop constraint if exists organizations_implementation_preference_check;

alter table public.organizations
  add constraint organizations_employee_range_check
  check (employee_range is null or employee_range in ('1_10', '11_50', '51_200', '200_plus')),
  add constraint organizations_industry_check
  check (industry is null or industry in ('technology', 'services', 'retail', 'industry', 'health', 'other')),
  add constraint organizations_implementation_preference_check
  check (implementation_preference is null or implementation_preference in ('guided', 'self_service'));
