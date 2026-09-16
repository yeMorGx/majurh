import { del, get, put } from '@vercel/blob';
import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import { companyLogoPath, validateCompanyLogo } from '@/lib/companies/assets';
import { companySelect } from '@/lib/companies/constants';
import { databaseErrorResponse, errorJson, isUuid, json } from '@/lib/api/http';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let uploadedPath: string | null = null;
  try {
    const { id } = await params;
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    if (!isUuid(id) || !isUuid(organizationId)) return errorJson('Informe organização e empresa válidas.', 400);

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return errorJson('Selecione um arquivo de logo.', 400);
    const logoError = validateCompanyLogo(file);
    if (logoError) return errorJson(logoError, 400);

    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    const role = await getOrganizationRole(db, userId, organizationId);
    if (!role || !['admin', 'recruiter'].includes(role)) return errorJson('Você não tem permissão para alterar logos de empresas.', 403);

    const existingRows = await db.query(
      'select organization_id, logo_path from public.companies where id = $1 limit 1',
      [id],
    ) as Array<{ organization_id: string; logo_path: string | null }>;
    const company = existingRows[0];
    if (!company || company.organization_id !== organizationId) return errorJson('Empresa não encontrada.', 404);

    uploadedPath = companyLogoPath(organizationId, id, file.type);
    await put(uploadedPath, file, { access: 'private', contentType: file.type, addRandomSuffix: false });
    const rows = await db.query(
      'update public.companies set logo_path = $1 where organization_id = $2 and id = $3 returning ' + companySelect,
      [uploadedPath, organizationId, id],
    );
    if (!rows[0]) return errorJson('Empresa não encontrada.', 404);

    if (company.logo_path && company.logo_path !== uploadedPath) {
      try { await del(company.logo_path); } catch { /* limpeza antiga é best-effort */ }
    }
    return json({ data: rows[0] });
  } catch (error) {
    if (uploadedPath) {
      try { await del(uploadedPath); } catch { /* compensação best-effort */ }
    }
    return databaseErrorResponse(error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return errorJson('Informe uma empresa válida.', 400);

    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);

    const rows = await db.query(
      'select organization_id, logo_path from public.companies where id = $1 limit 1',
      [id],
    ) as Array<{ organization_id: string; logo_path: string | null }>;
    const company = rows[0];
    if (!company) return errorJson('Empresa não encontrada.', 404);
    if (!await getOrganizationRole(db, userId, company.organization_id)) return errorJson('Você não tem acesso a esta organização.', 403);
    if (!company.logo_path) return errorJson('Logo não encontrada.', 404);

    const result = await get(company.logo_path, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
    });
    if (!result) return errorJson('Logo não encontrada.', 404);
    if (result.statusCode === 304) {
      return new Response(null, {
        status: 304,
        headers: { ETag: result.blob.etag, 'Cache-Control': 'private, max-age=300' },
      });
    }

    return new Response(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType,
        'Content-Disposition': 'inline',
        ETag: result.blob.etag,
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
