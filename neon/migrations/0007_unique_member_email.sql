-- Uma pessoa pertence a uma única organização por e-mail.
-- A conta de autenticação também permanece única no Neon Auth.

-- Completa e-mails de membros migrados antes de tornar o campo obrigatório.
update public.organization_members om
set email = lower(btrim(lau.email))
from public.legacy_auth_users lau
where lau.id = om.user_id
  and (om.email is null or btrim(om.email) = '')
  and lau.email is not null
  and btrim(lau.email) <> '';

create unique index if not exists legacy_auth_users_email_ci_idx
  on public.legacy_auth_users (lower(btrim(email)));

do $$ begin
  if not exists (
    select 1 from public.organization_members
    where email is null or btrim(email) = ''
  ) then
    alter table public.organization_members alter column email set not null;
  end if;
end $$;

create index if not exists organization_members_email_ci_idx
  on public.organization_members (lower(btrim(email)));

create or replace function public.prevent_member_email_cross_org()
returns trigger
language plpgsql
as $$
begin
  if new.email is null or btrim(new.email) = '' then
    return new;
  end if;

  if exists (
    select 1
    from public.organization_members om
    left join public.legacy_auth_users lau on lau.id = om.user_id
    where om.id <> new.id
      and om.organization_id <> new.organization_id
      and lower(coalesce(nullif(btrim(om.email), ''), nullif(btrim(lau.email), ''))) = lower(btrim(new.email))
  ) then
    raise exception using
      errcode = '23505',
      message = 'Este e-mail já está vinculado a outra organização.';
  end if;

  return new;
end;
$$;

drop trigger if exists organization_members_email_cross_org_trigger on public.organization_members;
create trigger organization_members_email_cross_org_trigger
before insert or update of organization_id, email on public.organization_members
for each row execute function public.prevent_member_email_cross_org();

-- Existe um vínculo histórico duplicado que precisa de decisão administrativa
-- antes de criar o índice UNIQUE definitivo em organization_members.email.
