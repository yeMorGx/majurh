-- Controla quantas posições de uma vaga estão reservadas por processos ativos.
-- Processos rejeitados, desistentes e itens enviados ao banco de talentos
-- liberam a posição novamente.

create index if not exists recruitment_processes_vacancy_capacity_idx
  on public.recruitment_processes (organization_id, vacancy_id, candidate_id, status);

create or replace function public.enforce_vacancy_capacity()
returns trigger
language plpgsql
as $$
declare
  vacancy_quantity integer;
  assigned_count integer;
  candidate_already_assigned boolean;
begin
  if new.vacancy_id is null
    or new.status in ('rejected'::public.process_status, 'withdrawn'::public.process_status, 'talent_pool'::public.process_status) then
    return new;
  end if;

  select v.quantity
    into vacancy_quantity
    from public.vacancies v
   where v.organization_id = new.organization_id
     and v.id = new.vacancy_id
   for update;

  -- A chave estrangeira continua sendo a responsável por informar uma vaga
  -- inexistente. Não mascaramos esse erro no gatilho.
  if vacancy_quantity is null then return new; end if;

  select count(distinct rp.candidate_id)::int,
         coalesce(bool_or(rp.candidate_id = new.candidate_id), false)
    into assigned_count, candidate_already_assigned
    from public.recruitment_processes rp
   where rp.organization_id = new.organization_id
     and rp.vacancy_id = new.vacancy_id
     and rp.id <> new.id
     and rp.status not in ('rejected'::public.process_status, 'withdrawn'::public.process_status, 'talent_pool'::public.process_status);

  if not candidate_already_assigned and assigned_count >= vacancy_quantity then
    raise exception 'A vaga já atingiu a quantidade de posições disponíveis.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists recruitment_processes_vacancy_capacity_trigger on public.recruitment_processes;
create trigger recruitment_processes_vacancy_capacity_trigger
before insert or update of organization_id, candidate_id, vacancy_id, status
on public.recruitment_processes
for each row execute function public.enforce_vacancy_capacity();

create or replace function public.prevent_vacancy_quantity_below_assigned()
returns trigger
language plpgsql
as $$
declare
  assigned_count integer;
begin
  if new.quantity >= old.quantity then return new; end if;

  select count(distinct rp.candidate_id)::int
    into assigned_count
    from public.recruitment_processes rp
   where rp.organization_id = new.organization_id
     and rp.vacancy_id = new.id
     and rp.status not in ('rejected'::public.process_status, 'withdrawn'::public.process_status, 'talent_pool'::public.process_status);

  if assigned_count > new.quantity then
    raise exception 'A quantidade da vaga não pode ser menor que o total de candidatos designados.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists vacancies_quantity_capacity_trigger on public.vacancies;
create trigger vacancies_quantity_capacity_trigger
before update of quantity
on public.vacancies
for each row execute function public.prevent_vacancy_quantity_below_assigned();
