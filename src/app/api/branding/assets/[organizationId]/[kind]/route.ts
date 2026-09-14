import { get } from '@vercel/blob';
import { databaseErrorResponse, errorJson, isUuid } from '@/lib/api/http';
import { getDatabase } from '@/lib/neon/db';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string; kind: string }> },
) {
  try {
    const { organizationId, kind } = await params;
    if (!isUuid(organizationId) || (kind !== 'logo' && kind !== 'login-banner')) return errorJson('Arquivo de marca inválido.', 400);

    const db = getDatabase();
    const rows = await db`
      select ${kind === 'logo' ? db.unsafe('brand_logo_path') : db.unsafe('brand_login_banner_path')} as path
      from public.organizations
      where id = ${organizationId}::uuid
      limit 1
    ` as Array<{ path: string | null }>;
    const pathname = rows[0]?.path;
    if (!pathname) return errorJson('Arquivo de marca não encontrado.', 404);

    const result = await get(pathname, { access: 'private', ifNoneMatch: request.headers.get('if-none-match') ?? undefined });
    if (!result) return errorJson('Arquivo de marca não encontrado.', 404);
    if (result.statusCode === 304) return new Response(null, { status: 304, headers: { ETag: result.blob.etag, 'Cache-Control': 'public, max-age=3600' } });
    return new Response(result.stream, { headers: { 'Content-Type': result.blob.contentType, ETag: result.blob.etag, 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
