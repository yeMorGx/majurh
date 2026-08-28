-- Dados neutros para desenvolvimento local.
-- Não cria usuários nem candidatos: esses registros dependem de auth.users.

insert into public.organizations (name, slug)
values ('Vieira Couto RH — demonstração', 'vieira-couto-demo')
on conflict (slug) do update set name = excluded.name;

insert into public.vacancies (organization_id, title, department, unit)
select organization.id, vacancy.title, vacancy.department, vacancy.unit
from public.organizations organization
cross join (
  values
    ('Motorista', 'Operação', 'Matriz'),
    ('Auxiliar operacional', 'Operação', 'Matriz'),
    ('Assistente administrativo', 'Administrativo', 'Matriz')
) as vacancy(title, department, unit)
where organization.slug = 'vieira-couto-demo'
  and not exists (
    select 1
    from public.vacancies existing
    where existing.organization_id = organization.id
      and existing.title = vacancy.title
      and existing.unit = vacancy.unit
  );
