const activeAssignmentFilter = "rp.status not in ('rejected'::public.process_status, 'withdrawn'::public.process_status, 'talent_pool'::public.process_status)";

export const vacancySelect = `id, organization_id, title, department, unit, quantity, company_id, is_active, created_at, updated_at,
  (select count(distinct rp.candidate_id)::int
   from public.recruitment_processes rp
   where rp.organization_id = public.vacancies.organization_id
     and rp.vacancy_id = public.vacancies.id
     and ${activeAssignmentFilter}) as assigned_count,
  greatest(quantity - (select count(distinct rp.candidate_id)::int
   from public.recruitment_processes rp
   where rp.organization_id = public.vacancies.organization_id
     and rp.vacancy_id = public.vacancies.id
     and ${activeAssignmentFilter}), 0)::int as available_count`;
