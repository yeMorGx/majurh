import { get } from '@vercel/blob';
import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import { errorJson, isUuid } from '@/lib/api/http';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
type FileRouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: FileRouteContext) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    const { id } = await context.params;
    if (!isUuid(organizationId) || !isUuid(id)) return errorJson('Informe organização e documento válidos.', 400);
    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    if (!await getOrganizationRole(db, userId, organizationId)) return errorJson('Você não tem acesso a esta organização.', 403);
    const rows = await db.query('select storage_path from public.candidate_documents where organization_id = $1 and id = $2', [organizationId, id]) as Array<{ storage_path: string | null }>;
    const pathname = rows[0]?.storage_path;
    if (!pathname) return errorJson('Documento não encontrado.', 404);
    const result = await get(pathname, { access: 'private', ifNoneMatch: request.headers.get('if-none-match') ?? undefined });
    if (!result) return errorJson('Arquivo não encontrado.', 404);
    if (result.statusCode === 304) return new Response(null, { status: 304, headers: { ETag: result.blob.etag, 'Cache-Control': 'private, no-store' } });
    return new Response(result.stream, { headers: { 'Content-Type': result.blob.contentType, 'Content-Disposition': result.blob.contentDisposition, ETag: result.blob.etag, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return errorJson('Não foi possível carregar o documento.', 502);
  }
}

