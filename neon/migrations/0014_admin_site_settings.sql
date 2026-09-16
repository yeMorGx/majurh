-- Configurações do projeto administrativo separado.
-- Credenciais do Google Analytics nunca são armazenadas no banco; ficam como
-- segredo server-side no projeto admin-portal.

create table if not exists public.admin_site_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  maintenance_mode boolean not null default false,
  public_site_url text,
  analytics_property_id text,
  analytics_measurement_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists admin_site_settings_set_updated_at on public.admin_site_settings;
create trigger admin_site_settings_set_updated_at
before update on public.admin_site_settings
for each row execute function public.set_updated_at();
