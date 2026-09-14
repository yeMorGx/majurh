import { databaseErrorResponse, errorJson, json } from '@/lib/api/http';
import { getDatabase } from '@/lib/neon/db';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/** Dados públicos mínimos para renderizar uma tela de login por organização. */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')?.trim().toLowerCase();
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return errorJson('Informe um slug de organização válido.', 400);
  }

  try {
    const db = getDatabase();
    const rows = await db`
      select id, name, slug, brand_logo_url, brand_primary_color, brand_accent_color,
        brand_login_banner_url, brand_login_kicker, brand_login_headline, brand_login_description
      from public.organizations
      where slug = ${slug}
      limit 1
    `;

    if (!rows[0]) return errorJson('Organização não encontrada.', 404);
    return json({ data: { organization: rows[0] } });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
