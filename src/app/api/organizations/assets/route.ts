import { del, put } from '@vercel/blob';
import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import { databaseErrorResponse, errorJson, isUuid, json } from '@/lib/api/http';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const maxAssetSize = 5 * 1024 * 1024;
const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);

export async function POST(request: NextRequest) {
  let uploadedPath: string | null = null;
  try {
    const formData = await request.formData();
    const organizationId = formData.get('organizationId');
    const kind = formData.get('kind');
    const file = formData.get('file');
    if (!isUuid(organizationId)) return errorJson('Informe uma organização válida.', 400);
    if (kind !== 'logo' && kind !== 'login-banner') return errorJson('Tipo de imagem inválido.', 400);
    if (!(file instanceof File)) return errorJson('Selecione um arquivo de imagem.', 400);
    if (!allowedTypes.has(file.type)) return errorJson('Use um arquivo PNG, JPG, WEBP ou SVG.', 400);
    if (file.size <= 0 || file.size > maxAssetSize) return errorJson('A imagem deve ter entre 1 byte e 5 MB.', 400);

    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    if (await getOrganizationRole(db, userId, organizationId) !== 'admin') return errorJson('Apenas administradores podem alterar os arquivos da marca.', 403);

    const existingRows = await db`
      select brand_logo_path, brand_login_banner_path
      from public.organizations
      where id = ${organizationId}::uuid
      limit 1
    ` as Array<{ brand_logo_path: string | null; brand_login_banner_path: string | null }>;
    if (!existingRows.length) return errorJson('Organização não encontrada.', 404);

    const path = `organizations/${organizationId}/brand/${kind}-${crypto.randomUUID()}.${extensionForType(file.type)}`;
    uploadedPath = path;
    await put(path, file, { access: 'private', contentType: file.type, addRandomSuffix: false });

    const rows = kind === 'logo'
      ? await db`
        update public.organizations set brand_logo_path = ${path}
        where id = ${organizationId}::uuid
        returning id, name, slug, brand_logo_path, brand_primary_color, brand_accent_color,
          brand_login_banner_path, brand_login_kicker, brand_login_headline, brand_login_description
      `
      : await db`
        update public.organizations set brand_login_banner_path = ${path}
        where id = ${organizationId}::uuid
        returning id, name, slug, brand_logo_path, brand_primary_color, brand_accent_color,
          brand_login_banner_path, brand_login_kicker, brand_login_headline, brand_login_description
      `;

    const previousPath = kind === 'logo' ? existingRows[0].brand_logo_path : existingRows[0].brand_login_banner_path;
    if (previousPath && previousPath !== path) {
      try { await del(previousPath); } catch { /* limpeza antiga é best-effort */ }
    }
    return json({ data: { organization: rows[0] } });
  } catch (error) {
    if (uploadedPath) {
      try { await del(uploadedPath); } catch { /* compensação best-effort */ }
    }
    return databaseErrorResponse(error);
  }
}

function extensionForType(type: string) {
  if (type === 'image/svg+xml') return 'svg';
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/webp') return 'webp';
  return 'png';
}
