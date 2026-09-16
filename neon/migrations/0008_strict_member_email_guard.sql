-- Impede qualquer duplicidade de e-mail em vínculos de organização.
-- O lock transacional evita que duas requisições concorrentes passem pela
-- consulta de existência ao mesmo tempo.

create or replace function public.prevent_member_email_cross_org()
returns trigger
language plpgsql
as $$
declare
  normalized_email text;
begin
  normalized_email = lower(nullif(btrim(new.email), ''));
  if normalized_email is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(normalized_email, 0));

  if exists (
    select 1
    from public.organization_members om
    left join public.legacy_auth_users lau on lau.id = om.user_id
    where om.id is distinct from new.id
      and lower(coalesce(nullif(btrim(om.email), ''), nullif(btrim(lau.email), ''))) = normalized_email
  ) then
    raise exception using
      errcode = '23505',
      message = 'Este e-mail já está vinculado a uma organização.';
  end if;

  return new;
end;
$$;

drop trigger if exists organization_members_email_cross_org_trigger on public.organization_members;
create trigger organization_members_email_cross_org_trigger
before insert or update of organization_id, email on public.organization_members
for each row execute function public.prevent_member_email_cross_org();

-- O índice UNIQUE definitivo será criado depois da remoção do vínculo
-- histórico duplicado identificado na migração 0007.
