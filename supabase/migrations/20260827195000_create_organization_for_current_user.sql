-- Permite que um usuário autenticado sem vínculo crie seu primeiro espaço de trabalho.
-- A função privada concentra o bypass necessário para o bootstrap; o wrapper público
-- permanece como invoker e só fica disponível para usuários autenticados.

create or replace function private.create_organization_for_current_user(requested_name text)
returns table (
  organization_id uuid,
  organization_name text,
  organization_slug text,
  organization_role public.app_role
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := (select auth.uid());
  clean_name text;
  base_slug text;
  candidate_slug text;
  created_id uuid;
  created_name text;
  created_slug text;
begin
  if actor_id is null then
    raise exception 'É necessário estar autenticado.' using errcode = '42501';
  end if;

  clean_name := pg_catalog.btrim(requested_name);
  if pg_catalog.char_length(clean_name) not between 2 and 120 then
    raise exception 'O nome da organização deve ter entre 2 e 120 caracteres.' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.organization_members member
    where member.user_id = actor_id
  ) then
    raise exception 'Seu usuário já está associado a uma organização.' using errcode = '42501';
  end if;

  base_slug := pg_catalog.lower(clean_name);
  base_slug := pg_catalog.translate(
    base_slug,
    'áàãâäéèêëíìîïóòõôöúùûüç',
    'aaaaaeeeeiiiiooooouuuuc'
  );
  base_slug := pg_catalog.regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := pg_catalog.btrim(base_slug, '-');
  base_slug := case when base_slug = '' then 'organizacao' else pg_catalog.left(base_slug, 80) end;
  candidate_slug := base_slug;

  while exists (
    select 1
    from public.organizations organization
    where organization.slug = candidate_slug
  ) loop
    candidate_slug := pg_catalog.left(base_slug, 70) || '-' || pg_catalog.substr(
      pg_catalog.md5(pg_catalog.clock_timestamp()::text || actor_id::text),
      1,
      8
    );
  end loop;

  insert into public.organizations (name, slug)
  values (clean_name, candidate_slug)
  returning id, name, slug into created_id, created_name, created_slug;

  insert into public.organization_members (organization_id, user_id, role)
  values (created_id, actor_id, 'admin');

  return query
    select created_id, created_name, created_slug, 'admin'::public.app_role;
end;
$$;

create or replace function public.create_organization_for_current_user(requested_name text)
returns table (
  organization_id uuid,
  organization_name text,
  organization_slug text,
  organization_role public.app_role
)
language sql
security invoker
set search_path = public, private
as $$
  select * from private.create_organization_for_current_user($1);
$$;

revoke all on function private.create_organization_for_current_user(text) from public;
grant execute on function private.create_organization_for_current_user(text) to authenticated;
revoke all on function public.create_organization_for_current_user(text) from public;
grant execute on function public.create_organization_for_current_user(text) to authenticated;
