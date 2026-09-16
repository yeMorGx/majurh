import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import { databaseErrorResponse, errorJson, isRecord, isUuid, json } from '@/lib/api/http';
import { processSelect, processStatuses } from '@/lib/processes/constants';
import { parseProcessPayload, validateWithdrawalState } from '@/lib/processes/validation';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    if (!isUuid(organizationId)) return errorJson('Informe um organizationId válido.', 400);
    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    if (!await getOrganizationRole(db, userId, organizationId)) return errorJson('Você não tem acesso a esta organização.', 403);

    const candidateId = request.nextUrl.searchParams.get('candidateId');
    if (candidateId && !isUuid(candidateId)) return errorJson('Informe um candidateId válido.', 400);
    const status = request.nextUrl.searchParams.get('status');
    if (status && !processStatuses.includes(status as (typeof processStatuses)[number])) return errorJson('Informe um status de processo válido.', 400);
    const page = parsePositiveInteger(request.nextUrl.searchParams.get('page'), 1);
    const pageSize = Math.min(parsePositiveInteger(request.nextUrl.searchParams.get('pageSize'), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const from = (page - 1) * pageSize;
    const conditions = ['organization_id = $1'];
    const params: unknown[] = [organizationId];
    if (candidateId) { params.push(candidateId); conditions.push(`candidate_id = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
    const pageParam = params.length + 1;
    const offsetParam = params.length + 2;
    const rows = await db.query(`select ${processSelect} from public.recruitment_processes where ${conditions.join(' and ')} order by started_at desc limit $${pageParam} offset $${offsetParam}`, [...params, pageSize, from]);
    const countRows = await db.query(`select count(*)::int as count from public.recruitment_processes where ${conditions.join(' and ')}`, params) as Array<{ count: number }>;
    const total = Number(countRows[0]?.count ?? 0);
    return json({ data: rows, pagination: { page, pageSize, total, totalPages: total ? Math.ceil(total / pageSize) : 0 } });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    if (!isRecord(body) || !isUuid(body.organizationId)) return errorJson('Informe um organizationId válido.', 400);
    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    const role = await getOrganizationRole(db, userId, body.organizationId);
    if (!role || !['admin', 'recruiter'].includes(role)) return errorJson('Você não tem permissão para criar processos.', 403);
    const parsed = parseProcessPayload(Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'organizationId')), 'create');
    if (!parsed.ok) return json({ error: 'Dados do processo inválidos.', fields: parsed.errors }, 400);
    const withdrawalError = validateWithdrawalState(parsed.data.status, parsed.data.withdrawal_reason_code);
    if (withdrawalError) return errorJson(withdrawalError, 400);
    const id = crypto.randomUUID();
    const value = parsed.data;

    if (value.vacancy_id && !['rejected', 'withdrawn', 'talent_pool'].includes(value.status ?? 'new')) {
      const capacityRows = await db`
        select v.quantity,
          count(distinct rp.candidate_id) filter (where rp.status not in ('rejected'::public.process_status, 'withdrawn'::public.process_status, 'talent_pool'::public.process_status))::int as assigned_count,
          coalesce(bool_or(rp.candidate_id = ${value.candidate_id} and rp.status not in ('rejected'::public.process_status, 'withdrawn'::public.process_status, 'talent_pool'::public.process_status)), false) as candidate_already_assigned
        from public.vacancies v
        left join public.recruitment_processes rp
          on rp.organization_id = v.organization_id and rp.vacancy_id = v.id
        where v.organization_id = ${body.organizationId}::uuid and v.id = ${value.vacancy_id}::uuid
        group by v.quantity
      ` as Array<{ quantity: number; assigned_count: number; candidate_already_assigned: boolean }>;
      const capacity = capacityRows[0];
      if (capacity && !capacity.candidate_already_assigned && capacity.assigned_count >= capacity.quantity) {
        return errorJson('Esta vaga já atingiu a quantidade de posições disponíveis.', 409);
      }
    }

    const result = await db.transaction((tx) => [
      tx`
        insert into public.recruitment_processes (
          id, organization_id, candidate_id, vacancy_id, responsible_user_id, source, status,
          started_at, finished_at, withdrawal_reason_code, withdrawal_notes, can_apply_again
        ) values (
          ${id}, ${body.organizationId}, ${value.candidate_id}, ${value.vacancy_id ?? null},
          ${value.responsible_user_id ?? null}, ${value.source ?? null}, ${value.status ?? 'new'},
          ${value.started_at ?? new Date().toISOString()}, ${value.finished_at ?? null},
          ${value.withdrawal_reason_code ?? null}, ${value.withdrawal_notes ?? null}, ${value.can_apply_again ?? null}
        ) returning ${db.unsafe(processSelect)}
      `,
      tx`
        insert into public.process_history (organization_id, process_id, actor_user_id, action, new_status)
        values (${body.organizationId}, ${id}, ${userId}, 'process_created', ${value.status ?? 'new'})
      `,
    ]);
    return json({ data: result[0][0] }, 201);
  } catch (error) {
    return databaseErrorResponse(error, { foreignKeyMessage: 'Candidato, vaga ou responsável não encontrado.', constraintMessage: 'Esta vaga já atingiu a quantidade de posições disponíveis ou o processo withdrawn não possui motivo.' });
  }
}

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function readJson(request: NextRequest) {
  try { return await request.json() as unknown; } catch { return null; }
}
