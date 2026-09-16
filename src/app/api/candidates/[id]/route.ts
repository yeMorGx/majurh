import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import { databaseErrorResponse, errorJson, isRecord, isUuid, json } from '@/lib/api/http';
import { candidateSelect } from '@/lib/candidates/constants';
import { parseCandidatePayload } from '@/lib/candidates/validation';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
type CandidateRouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: CandidateRouteContext) {
  return withCandidateContext(request, context, 'viewer', async ({ db, organizationId, id }) => {
    const rows = await db.query(
      `select ${candidateSelect} from public.candidates where organization_id = $1 and id = $2`,
      [organizationId, id],
    );
    if (!rows[0]) return errorJson('Candidato não encontrado.', 404);
    return json({ data: rows[0] });
  });
}
export async function PATCH(request: NextRequest, context: CandidateRouteContext) {
  return withCandidateContext(request, context, 'recruiter', async ({ db, organizationId, id }) => {
    const body = await readJson(request);
    if (!isRecord(body)) return errorJson('O corpo da requisição deve ser um objeto JSON.', 400);
    const parsed = parseCandidatePayload(body, 'update');
    if (!parsed.ok) return json({ error: 'Dados do candidato inválidos.', fields: parsed.errors }, 400);
    const entries = Object.entries(parsed.data);
    if (!entries.length) return errorJson('Informe ao menos um campo para atualizar.', 400);

    const assignments = entries.map(([field], index) => `${field} = $${index + 1}`).join(', ');
    const rows = await db.query(
      `update public.candidates set ${assignments} where organization_id = $${entries.length + 1} and id = $${entries.length + 2} returning ${candidateSelect}`,
      [...entries.map(([, value]) => value), organizationId, id],
    );
    if (!rows[0]) return errorJson('Candidato não encontrado.', 404);
    return json({ data: rows[0] });
  });
}

export async function DELETE(request: NextRequest, context: CandidateRouteContext) {
  return withCandidateContext(request, context, 'admin', async ({ db, organizationId, id }) => {
    const rows = await db.query(
      'delete from public.candidates where organization_id = $1 and id = $2 returning id',
      [organizationId, id],
    );
    if (!rows[0]) return errorJson('Candidato não encontrado.', 404);
    return json({ data: { id } });
  });
}

async function withCandidateContext(
  request: NextRequest,
  context: CandidateRouteContext,
  requiredRole: 'viewer' | 'recruiter' | 'admin',
  handler: (context: { db: Awaited<ReturnType<typeof getAuthenticatedClient>>['db']; organizationId: string; id: string }) => Promise<Response>,
) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    const { id } = await context.params;
    if (!isUuid(organizationId)) return errorJson('Informe um organizationId válido.', 400);
    if (!isUuid(id)) return errorJson('Informe um id de candidato válido.', 400);
    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    const role = await getOrganizationRole(db, userId, organizationId);
    const levels = { viewer: 1, manager: 2, recruiter: 2, admin: 3 };
    if (!role || levels[role] < levels[requiredRole]) return errorJson('Você não tem permissão para esta operação.', 403);
    return handler({ db, organizationId, id });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

async function readJson(request: NextRequest) {
  try { return await request.json() as unknown; } catch { return null; }
}
