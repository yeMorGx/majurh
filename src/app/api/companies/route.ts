import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import { companySelect } from '@/lib/companies/constants';
import { parseCompanyPayload } from '@/lib/companies/validation';
import { databaseErrorResponse, errorJson, isRecord, isUuid, json } from '@/lib/api/http';
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
      `select ${companySelect} from public.companies where organization_id = $1 ${activeOnly ? 'and is_active = true' : ''} order by name asc`,
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
    if (!role || !['admin', 'recruiter'].includes(role)) return errorJson('Você não tem permissão para cadastrar empresas.', 403);
    const parsed = parseCompanyPayload(Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'organizationId')), 'create');
    if (!parsed.ok) return json({ error: 'Dados da empresa inválidos.', fields: parsed.errors }, 400);
    const value = parsed.data;
    const rows = await db`
      insert into public.companies (organization_id, name, legal_name, cnpj)
      values (${body.organizationId}, ${value.name}, ${value.legal_name ?? null}, ${value.cnpj ?? null})
      returning ${db.unsafe(companySelect)}
    `;
    return json({ data: rows[0] }, 201);
  } catch (error) {
    return databaseErrorResponse(error, { duplicateMessage: 'Esta empresa já está cadastrada nesta organização.' });
  }
}

async function readJson(request: NextRequest) {
  try { return await request.json() as unknown; } catch { return null; }
}
