import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import { databaseErrorResponse, errorJson, isUuid, json } from '@/lib/api/http';
import { processHistorySelect } from '@/lib/processes/constants';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
type HistoryRouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: HistoryRouteContext) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    const { id } = await context.params;
    if (!isUuid(organizationId)) return errorJson('Informe um organizationId válido.', 400);
    if (!isUuid(id)) return errorJson('Informe um id de processo válido.', 400);
    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    if (!await getOrganizationRole(db, userId, organizationId)) return errorJson('Você não tem acesso a esta organização.', 403);
    const rows = await db.query(`select ${processHistorySelect} from public.process_history where organization_id = $1 and process_id = $2 order by created_at desc`, [organizationId, id]);
    return json({ data: rows });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
