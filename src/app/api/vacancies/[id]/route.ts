import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import { databaseErrorResponse, errorJson, isRecord, isUuid, json } from '@/lib/api/http';
import { vacancySelect } from '@/lib/vacancies/constants';
import { parseVacancyPayload } from '@/lib/vacancies/validation';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
type VacancyContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: VacancyContext) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    const { id } = await context.params;
    if (!isUuid(organizationId) || !isUuid(id)) return errorJson('Informe organização e vaga válidas.', 400);
    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    const role = await getOrganizationRole(db, userId, organizationId);
    if (!role || !['admin', 'recruiter'].includes(role)) return errorJson('Você não tem permissão para editar vagas.', 403);
    const body = await readJson(request);
    if (!isRecord(body)) return errorJson('O corpo da requisição deve ser um objeto JSON.', 400);
    const parsed = parseVacancyPayload(body, 'update');
    if (!parsed.ok) return json({ error: 'Dados da vaga inválidos.', fields: parsed.errors }, 400);
    const entries = Object.entries(parsed.data);
    if (!entries.length) return errorJson('Informe ao menos um campo para atualizar.', 400);
    if (parsed.data.quantity !== undefined) {
      const capacityRows = await db`
        select v.quantity,
          count(distinct rp.candidate_id) filter (where rp.status not in ('rejected'::public.process_status, 'withdrawn'::public.process_status, 'talent_pool'::public.process_status))::int as assigned_count
        from public.vacancies v
        left join public.recruitment_processes rp
          on rp.organization_id = v.organization_id and rp.vacancy_id = v.id
        where v.organization_id = ${organizationId}::uuid and v.id = ${id}::uuid
        group by v.quantity
      ` as Array<{ quantity: number; assigned_count: number }>;
      const capacity = capacityRows[0];
      if (capacity && parsed.data.quantity < capacity.assigned_count) {
        return errorJson(`A vaga já possui ${capacity.assigned_count} candidato${capacity.assigned_count === 1 ? '' : 's'} designado${capacity.assigned_count === 1 ? '' : 's'}. A quantidade não pode ser menor que esse total.`, 409);
      }
    }
    const assignments = entries.map(([field], index) => `${field} = $${index + 1}`).join(', ');
    const rows = await db.query(
      `update public.vacancies set ${assignments} where organization_id = $${entries.length + 1} and id = $${entries.length + 2} returning ${vacancySelect}`,
      [...entries.map(([, value]) => value), organizationId, id],
    );
    if (!rows[0]) return errorJson('Vaga não encontrada.', 404);
    return json({ data: rows[0] });
  } catch (error) {
    return databaseErrorResponse(error, { notFoundMessage: 'Vaga não encontrada.', constraintMessage: 'A quantidade não pode ser menor que o total de candidatos designados.' });
  }
}
async function readJson(request: NextRequest) {
  try { return await request.json() as unknown; } catch { return null; }
}
