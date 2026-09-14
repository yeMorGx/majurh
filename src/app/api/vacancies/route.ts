import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import { databaseErrorResponse, errorJson, isRecord, isUuid, json } from '@/lib/api/http';
import { vacancySelect } from '@/lib/vacancies/constants';
import { parseVacancyPayload } from '@/lib/vacancies/validation';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    if (!isUuid(organizationId)) return errorJson('Informe um organizationId válido.', 400);
    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    if (!await getOrganizationRole(db, userId, organizationId)) return errorJson('Você não tem acesso a esta organização.', 403);
    const activeOnly = request.nextUrl.searchParams.get('activeOnly') !== 'false';
    const rows = await db.query(
      `select ${vacancySelect} from public.vacancies where organization_id = $1 ${activeOnly ? 'and is_active = true' : ''} order by title asc`,
      [organizationId],
    );
    return json({ data: rows });
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
    if (!role || !['admin', 'recruiter'].includes(role)) return errorJson('Você não tem permissão para cadastrar vagas.', 403);
    const parsed = parseVacancyPayload(Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'organizationId')), 'create');
    if (!parsed.ok) return json({ error: 'Dados da vaga inválidos.', fields: parsed.errors }, 400);
    const rows = await db`
      insert into public.vacancies (organization_id, title, department, unit, is_active)
      values (${body.organizationId}, ${parsed.data.title}, ${parsed.data.department ?? null}, ${parsed.data.unit ?? null}, ${parsed.data.is_active ?? true})
      returning ${db.unsafe(vacancySelect)}
    `;
    return json({ data: rows[0] }, 201);
  } catch (error) {
    return databaseErrorResponse(error, { duplicateMessage: 'Esta vaga já existe nesta organização.' });
  }
}

async function readJson(request: NextRequest) {
  try { return await request.json() as unknown; } catch { return null; }
}
