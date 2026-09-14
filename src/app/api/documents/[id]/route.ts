import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import { databaseErrorResponse, errorJson, isRecord, isUuid, json } from '@/lib/api/http';
import { documentSelect, documentStatuses, type DocumentStatus } from '@/lib/documents/constants';
import { parseDocumentReviewPayload } from '@/lib/documents/validation';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
type DocumentRouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: DocumentRouteContext) {
  return withDocumentContext(request, context, 'viewer', async ({ db, organizationId, id }) => {
    const rows = await db.query(`select ${documentSelect} from public.candidate_documents where organization_id = $1 and id = $2`, [organizationId, id]);
    const document = rows[0] as { storage_path?: string | null } | undefined;
    if (!document) return errorJson('Documento não encontrado.', 404);
    return json({ data: document, signedUrl: document.storage_path ? `/api/documents/${id}/file?organizationId=${organizationId}` : null });
  });
}
export async function PATCH(request: NextRequest, context: DocumentRouteContext) {
  return withDocumentContext(request, context, 'recruiter', async ({ db, organizationId, id, userId }) => {
    let body: unknown;
    try { body = await request.json(); } catch { return errorJson('O corpo da requisição deve ser um JSON válido.', 400); }
    if (!isRecord(body)) return errorJson('O corpo da requisição deve ser um objeto JSON.', 400);
    const parsed = parseDocumentReviewPayload(body);
    if (!parsed.ok) return json({ error: 'Dados da revisão inválidos.', fields: parsed.errors }, 400);
    const update = { ...parsed.data } as Record<string, unknown>;
    if (parsed.data.status) {
      if (isReviewCompleted(parsed.data.status)) { update.reviewed_by = userId; update.reviewed_at = new Date().toISOString(); }
      else { update.reviewed_by = null; update.reviewed_at = null; }
    }
    const entries = Object.entries(update);
    const assignments = entries.map(([field], index) => `${field} = $${index + 1}`).join(', ');
    const rows = await db.query(`update public.candidate_documents set ${assignments} where organization_id = $${entries.length + 1} and id = $${entries.length + 2} returning ${documentSelect}`, [...entries.map(([, value]) => value), organizationId, id]);
    if (!rows[0]) return errorJson('Documento não encontrado.', 404);
    return json({ data: rows[0] });
  });
}

async function withDocumentContext(request: NextRequest, context: DocumentRouteContext, requiredRole: 'viewer' | 'recruiter', handler: (context: { db: Awaited<ReturnType<typeof getAuthenticatedClient>>['db']; organizationId: string; id: string; userId: string }) => Promise<Response>) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    const { id } = await context.params;
    if (!isUuid(organizationId)) return errorJson('Informe um organizationId válido.', 400);
    if (!isUuid(id)) return errorJson('Informe um id de documento válido.', 400);
    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    const role = await getOrganizationRole(db, userId, organizationId);
    const levels = { viewer: 1, recruiter: 2, admin: 3 };
    if (!role || levels[role] < levels[requiredRole]) return errorJson('Você não tem permissão para esta operação.', 403);
    return handler({ db, organizationId, id, userId });
  } catch (error) {
    return databaseErrorResponse(error, { notFoundMessage: 'Documento não encontrado.' });
  }
}

function isReviewCompleted(status: DocumentStatus) {
  return ['approved', 'rejected', 'request_again'].includes(status);
}
