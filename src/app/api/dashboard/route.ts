import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import { databaseErrorResponse, errorJson, isUuid, json } from '@/lib/api/http';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const activeProcessStatuses = ['new', 'screening', 'interview', 'evaluation', 'approved', 'documentation', 'admission', 'talent_pool'];

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    if (!isUuid(organizationId)) return errorJson('Informe um organizationId válido.', 400);
    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    if (!await getOrganizationRole(db, userId, organizationId)) return errorJson('Você não tem acesso a esta organização.', 403);

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const [metrics, recentProcesses, pendingDocuments, history] = await Promise.all([
      db.query(`
        select
          count(*) filter (where status = any($2::public.process_status[]))::int as "activeProcesses",
          count(*) filter (where status = 'interview')::int as interviews,
          (select count(*)::int from public.candidate_documents where organization_id = $1 and status = any($3::public.document_status[])) as "pendingDocuments",
          count(*) filter (where status = 'hired' and finished_at >= $4)::int as "hiredThisMonth"
        from public.recruitment_processes where organization_id = $1
      `, [organizationId, activeProcessStatuses, ['pending', 'request_again'], monthStart.toISOString()]),
      db.query(`
        select p.id, p.candidate_id, p.vacancy_id, p.status, p.started_at, p.updated_at,
          c.full_name as candidate_name, coalesce(v.title, 'Processo sem vaga') as vacancy_title
        from public.recruitment_processes p
        join public.candidates c on c.id = p.candidate_id and c.organization_id = p.organization_id
        left join public.vacancies v on v.id = p.vacancy_id and v.organization_id = p.organization_id
        where p.organization_id = $1 order by p.updated_at desc limit 6
      `, [organizationId]),
      db.query(`
        select d.id, d.candidate_id, d.document_type, d.status, d.original_name, d.created_at,
          c.full_name as candidate_name
        from public.candidate_documents d
        join public.candidates c on c.id = d.candidate_id and c.organization_id = d.organization_id
        where d.organization_id = $1 and d.status = any($2::public.document_status[])
        order by d.created_at asc limit 6
      `, [organizationId, ['pending', 'request_again']]),
      db.query(`
        select h.id, h.process_id, h.action, h.old_status, h.new_status, h.created_at,
          c.full_name as candidate_name
        from public.process_history h
        join public.recruitment_processes p on p.id = h.process_id and p.organization_id = h.organization_id
        join public.candidates c on c.id = p.candidate_id and c.organization_id = p.organization_id
        where h.organization_id = $1 order by h.created_at desc limit 8
      `, [organizationId]),
    ]);

    return json({ data: { metrics: metrics[0] ?? { activeProcesses: 0, interviews: 0, pendingDocuments: 0, hiredThisMonth: 0 }, recentProcesses, pendingDocuments, activity: history } });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
