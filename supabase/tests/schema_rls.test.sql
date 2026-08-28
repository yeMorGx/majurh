-- Smoke test do schema inicial.
-- Executar com: supabase test db --local

begin;

select no_plan();

select has_table('public', 'organizations', 'organizations existe');
select has_table('public', 'profiles', 'profiles existe');
select has_table('public', 'organization_members', 'organization_members existe');
select has_table('public', 'vacancies', 'vacancies existe');
select has_table('public', 'candidates', 'candidates existe');
select has_table('public', 'recruitment_processes', 'recruitment_processes existe');
select has_table('public', 'candidate_documents', 'candidate_documents existe');
select has_table('public', 'process_history', 'process_history existe');

select is(
  (select relrowsecurity from pg_class where oid = 'public.organizations'::regclass),
  true,
  'RLS habilitado em organizations'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.organization_members'::regclass),
  true,
  'RLS habilitado em organization_members'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.candidates'::regclass),
  true,
  'RLS habilitado em candidates'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.recruitment_processes'::regclass),
  true,
  'RLS habilitado em recruitment_processes'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.candidate_documents'::regclass),
  true,
  'RLS habilitado em candidate_documents'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.process_history'::regclass),
  true,
  'RLS habilitado em process_history'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'candidates'
      and policyname = 'candidates_select_members'
  ),
  'candidates tem política de leitura por organização'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'candidate_documents_storage_select'
  ),
  'Storage tem política de leitura para documentos'
);
select ok(
  exists (
    select 1 from storage.buckets
    where id = 'candidate-documents'
      and public = false
      and file_size_limit = 6291456
  ),
  'bucket de documentos é privado e limitado a 6 MB'
);

-- Fixtures descartáveis para exercitar as policies como usuários autenticados.
create temporary table rls_fixture (
  organization_a uuid not null,
  organization_b uuid not null,
  admin_user uuid not null,
  viewer_user uuid not null,
  outsider_user uuid not null,
  candidate_a uuid not null,
  process_a uuid not null
) on commit drop;

insert into rls_fixture
values (
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid()
);

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_sso_user,
  is_anonymous
)
select user_id,
       'authenticated',
       'authenticated',
       'rls-' || replace(user_id::text, '-', '') || '@example.test',
       '',
       now(),
       '{}'::jsonb,
       '{}'::jsonb,
       false,
       false
from rls_fixture
cross join lateral unnest(array[
  rls_fixture.admin_user,
  rls_fixture.viewer_user,
  rls_fixture.outsider_user
]) as users(user_id);

insert into public.organizations (id, name, slug)
select organization_a, 'RLS Teste A', 'rls-teste-a-' || left(replace(organization_a::text, '-', ''), 8)
from rls_fixture
union all
select organization_b, 'RLS Teste B', 'rls-teste-b-' || left(replace(organization_b::text, '-', ''), 8)
from rls_fixture;

insert into public.organization_members (organization_id, user_id, role)
select organization_a, admin_user, 'admin'::public.app_role from rls_fixture
union all
select organization_a, viewer_user, 'viewer'::public.app_role from rls_fixture
union all
select organization_b, outsider_user, 'admin'::public.app_role from rls_fixture;

insert into public.candidates (
  id,
  organization_id,
  full_name,
  cpf,
  cpf_normalized,
  created_by
)
select candidate_a,
       organization_a,
       'Candidato RLS',
       '111.111.111-11',
       '11111111111',
       admin_user
from rls_fixture;

insert into public.recruitment_processes (
  id,
  organization_id,
  candidate_id,
  status
)
select process_a,
       organization_a,
       candidate_a,
       'new'::public.process_status
from rls_fixture;

select set_config('test.rls_org_a', organization_a::text, true),
       set_config('test.rls_candidate_a', candidate_a::text, true),
       set_config('test.rls_process_a', process_a::text, true)
from rls_fixture;

select set_config('request.jwt.claim.sub', admin_user::text, true),
       set_config('request.jwt.claim.role', 'authenticated', true)
from rls_fixture;
set local role authenticated;

select is(
  (select count(*)::int
   from public.candidates
   where id = current_setting('test.rls_candidate_a')::uuid),
  1,
  'admin lê candidato da própria organização'
);
select is(
  (select count(*)::int
   from public.process_history
   where process_id = current_setting('test.rls_process_a')::uuid),
  1,
  'membro lê histórico do processo da própria organização'
);
update public.candidates
set notes = 'atualizado pelo admin'
where id = current_setting('test.rls_candidate_a')::uuid;
select is(
  (select notes
   from public.candidates
   where id = current_setting('test.rls_candidate_a')::uuid),
  'atualizado pelo admin',
  'admin atualiza candidato da própria organização'
);

reset role;
select set_config('request.jwt.claim.sub', viewer_user::text, true)
from rls_fixture;
set local role authenticated;

select is(
  (select count(*)::int
   from public.candidates
   where id = current_setting('test.rls_candidate_a')::uuid),
  1,
  'viewer lê candidato da própria organização'
);
update public.candidates
set notes = 'tentativa do viewer'
where id = current_setting('test.rls_candidate_a')::uuid;
select is(
  (select notes
   from public.candidates
   where id = current_setting('test.rls_candidate_a')::uuid),
  'atualizado pelo admin',
  'viewer não atualiza candidato'
);

reset role;
select set_config('request.jwt.claim.sub', outsider_user::text, true)
from rls_fixture;
set local role authenticated;

select is(
  (select count(*)::int
   from public.candidates
   where organization_id = current_setting('test.rls_org_a')::uuid),
  0,
  'usuário de outra organização não lê candidatos'
);
select is(
  (select count(*)::int
   from public.process_history
   where organization_id = current_setting('test.rls_org_a')::uuid),
  0,
  'usuário de outra organização não lê histórico'
);

reset role;

select * from finish();
rollback;
