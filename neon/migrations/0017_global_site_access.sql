-- Acessos gerais do Majurh.
-- O console administrativo cria a conta de acesso ao produto, mas não cria
-- organization_members. A organização passa a ser criada pelo próprio usuário
-- no primeiro acesso ao Majurh.

create table if not exists public.site_access_users (
  user_id text primary key,
  email text not null,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  is_active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists site_access_users_email_lower_uidx
  on public.site_access_users (lower(btrim(email)));

create index if not exists site_access_users_active_created_idx
  on public.site_access_users (is_active, created_at desc);

drop trigger if exists site_access_users_set_updated_at on public.site_access_users;
create trigger site_access_users_set_updated_at
before update on public.site_access_users
for each row execute function public.set_updated_at();

-- Preserva usuários que já receberam acesso por uma organização antes da
-- separação do console. Eles continuam podendo usar o produto, mas os novos
-- acessos não recebem vínculo automático com nenhuma organização.
insert into public.site_access_users (user_id, email, full_name, created_at)
select distinct on (om.user_id)
  om.user_id,
  coalesce(nullif(btrim(om.email), ''), nullif(btrim(lau.email), '')),
  coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(lau.full_name), ''), 'Usuário Majurh'),
  om.created_at
from public.organization_members om
left join public.profiles p on p.id = om.user_id
left join public.legacy_auth_users lau on lau.id = om.user_id
where coalesce(nullif(btrim(om.email), ''), nullif(btrim(lau.email), '')) is not null
order by om.user_id, om.created_at asc
on conflict (user_id) do update set
  email = excluded.email,
  full_name = excluded.full_name;
