import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import { companySelect } from '@/lib/companies/constants';
import { parseCompanyPayload } from '@/lib/companies/validation';
import { databaseErrorResponse, errorJson, isRecord, isUuid, json } from '@/lib/api/http';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
type CompanyContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: CompanyContext) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    const { id } = await context.params;
    if (!isUuid(organizationId) || !isUuid(id)) return errorJson('Informe organização e empresa válidas.', 400);
    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    const role = await getOrganizationRole(db, userId, organizationId);
    if (!role || !['admin', 'recruiter'].includes(role)) return errorJson('Você não tem permissão para editar empresas.', 403);
    const body = await readJson(request);
    if (!isRecord(body)) return errorJson('O corpo da requisição deve ser um objeto JSON.', 400);
    const parsed = parseCompanyPayload(body, 'update');
    if (!parsed.ok) return json({ error: 'Dados da empresa inválidos.', fields: parsed.errors }, 400);
    const entries = Object.entries(parsed.data);
    if (!entries.length) return errorJson('Informe ao menos um campo para atualizar.', 400);
    const assignments = entries.map(([field], index) => `${field} = $${index + 1}`).join(', ');
    const rows = await db.query(
      `update public.companies set ${assignments} where organization_id = $${entries.length + 1} and id = $${entries.length + 2} returning ${companySelect}`,
      [...entries.map(([, value]) => value), organizationId, id],
    );
    if (!rows[0]) return errorJson('Empresa não encontrada.', 404);
    return json({ data: rows[0] });
  } catch (error) {
    return databaseErrorResponse(error, { duplicateMessage: 'Esta empresa já está cadastrada nesta organização.' });
  }
}

async function readJson(request: NextRequest) {
  try { return await request.json() as unknown; } catch { return null; }
}
