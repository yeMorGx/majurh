import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import { databaseErrorResponse, errorJson, isRecord, isUuid, json } from '@/lib/api/http';
import { processSelect, type ProcessStatus, type WithdrawalReasonCode } from '@/lib/processes/constants';
import { parseProcessPayload, validateWithdrawalState } from '@/lib/processes/validation';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
type ProcessRouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: ProcessRouteContext) {
  return withProcessContext(request, context, 'viewer', async ({ db, organizationId, id }) => {
    const rows = await db.query(`select ${processSelect} from public.recruitment_processes where organization_id = $1 and id = $2`, [organizationId, id]);
    if (!rows[0]) return errorJson('Processo seletivo não encontrado.', 404);
    return json({ data: rows[0] });
  });
}

export async function PATCH(request: NextRequest, context: ProcessRouteContext) {
  return withProcessContext(request, context, 'recruiter', async ({ db, organizationId, id, userId }) => {
    const body = await readJson(request);
    if (!isRecord(body)) return errorJson('O corpo da requisição deve ser um objeto JSON.', 400);
    const parsed = parseProcessPayload(body, 'update');
    if (!parsed.ok) return json({ error: 'Dados do processo inválidos.', fields: parsed.errors }, 400);
    const entries = Object.entries(parsed.data);
    if (!entries.length) return errorJson('Informe ao menos um campo para atualizar.', 400);
    const currentRows = await db.query('select status, withdrawal_reason_code, candidate_id, vacancy_id from public.recruitment_processes where organization_id = $1 and id = $2', [organizationId, id]) as Array<{ status: ProcessStatus; withdrawal_reason_code: WithdrawalReasonCode | null; candidate_id: string; vacancy_id: string | null }>;
    const current = currentRows[0];
    if (!current) return errorJson('Processo seletivo não encontrado.', 404);
    const nextStatus = parsed.data.status ?? current.status;
    const nextReason = Object.prototype.hasOwnProperty.call(parsed.data, 'withdrawal_reason_code') ? parsed.data.withdrawal_reason_code : current.withdrawal_reason_code;
    const withdrawalError = validateWithdrawalState(nextStatus, nextReason);
    if (withdrawalError) return errorJson(withdrawalError, 400);
    const nextVacancyId = Object.prototype.hasOwnProperty.call(parsed.data, 'vacancy_id') ? parsed.data.vacancy_id : current.vacancy_id;
    if (nextVacancyId && !['rejected', 'withdrawn', 'talent_pool'].includes(nextStatus)) {
      const capacityRows = await db`
        select v.quantity,
          count(distinct rp.candidate_id) filter (where rp.status not in ('rejected'::public.process_status, 'withdrawn'::public.process_status, 'talent_pool'::public.process_status))::int as assigned_count,
          coalesce(bool_or(rp.candidate_id = ${current.candidate_id} and rp.status not in ('rejected'::public.process_status, 'withdrawn'::public.process_status, 'talent_pool'::public.process_status)), false) as candidate_already_assigned
        from public.vacancies v
        left join public.recruitment_processes rp
          on rp.organization_id = v.organization_id and rp.vacancy_id = v.id and rp.id <> ${id}::uuid
        where v.organization_id = ${organizationId}::uuid and v.id = ${nextVacancyId}::uuid
        group by v.quantity
      ` as Array<{ quantity: number; assigned_count: number; candidate_already_assigned: boolean }>;
      const capacity = capacityRows[0];
      if (capacity && !capacity.candidate_already_assigned && capacity.assigned_count >= capacity.quantity) {
        return errorJson('Esta vaga já atingiu a quantidade de posições disponíveis.', 409);
      }
    }
    const assignments = entries.map(([field], index) => `${field} = $${index + 1}`).join(', ');
    const values = [...entries.map(([, value]) => value), organizationId, id];
    const updateQuery = `update public.recruitment_processes set ${assignments} where organization_id = $${entries.length + 1} and id = $${entries.length + 2} returning ${processSelect}`;
    const updatedRows = nextStatus !== current.status
      ? (await db.transaction((tx) => [
        tx.query(updateQuery, values),
        tx`insert into public.process_history (organization_id, process_id, actor_user_id, action, old_status, new_status) values (${organizationId}, ${id}, ${userId}, 'status_changed', ${current.status}, ${nextStatus})`,
      ]))[0]
      : await db.query(updateQuery, values);
    const updated = updatedRows[0];
    if (!updated) return errorJson('Processo seletivo não encontrado.', 404);
    return json({ data: updated });
  });
}

async function withProcessContext(request: NextRequest, context: ProcessRouteContext, requiredRole: 'viewer' | 'recruiter', handler: (context: { db: Awaited<ReturnType<typeof getAuthenticatedClient>>['db']; organizationId: string; id: string; userId: string }) => Promise<Response>) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    const { id } = await context.params;
    if (!isUuid(organizationId)) return errorJson('Informe um organizationId válido.', 400);
    if (!isUuid(id)) return errorJson('Informe um id de processo válido.', 400);
    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    const role = await getOrganizationRole(db, userId, organizationId);
    const levels = { viewer: 1, recruiter: 2, admin: 3 };
    if (!role || levels[role] < levels[requiredRole]) return errorJson('Você não tem permissão para esta operação.', 403);
    return handler({ db, organizationId, id, userId });
  } catch (error) {
    return databaseErrorResponse(error, { notFoundMessage: 'Processo seletivo não encontrado.', constraintMessage: 'Esta vaga já atingiu a quantidade de posições disponíveis ou o processo withdrawn não possui motivo.' });
  }
}

async function readJson(request: NextRequest) {
  try { return await request.json() as unknown; } catch { return null; }
}
