import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import { databaseErrorResponse, errorJson, isRecord, json } from '@/lib/api/http';
import { normalizeHex } from '@/lib/branding';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest) {
  return errorJson('A criação de organizações está desativada. Solicite um convite ao administrador da plataforma.', 403);
}

export async function PATCH(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorJson('O corpo da requisição deve ser um JSON válido.', 400);
    }

    if (!isRecord(body) || typeof body.organizationId !== 'string' || typeof body.name !== 'string') {
      return errorJson('Informe a organização e o nome exibido.', 400);
    }

    const organizationId = body.organizationId.trim();
    const name = body.name.trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(organizationId)) {
      return errorJson('Organização inválida.', 400);
    }
    if (name.length < 2 || name.length > 120) {
      return errorJson('O nome da organização deve ter entre 2 e 120 caracteres.', 400);
    }

    const primaryColor = readNullableHex(body.brandPrimaryColor);
    const accentColor = readNullableHex(body.brandAccentColor);
    if (primaryColor === 'invalid' || accentColor === 'invalid') return errorJson('As cores devem estar no formato hexadecimal, por exemplo #4a1119.', 400);

    const loginKicker = readLimitedString(body.brandLoginKicker, 80);
    const loginHeadline = readLimitedString(body.brandLoginHeadline, 140);
    const loginDescription = readLimitedString(body.brandLoginDescription, 240);
    if (loginKicker === 'invalid' || loginHeadline === 'invalid' || loginDescription === 'invalid') {
      return errorJson('Os textos da tela de login ultrapassam o limite permitido.', 400);
    }

    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    const role = await getOrganizationRole(db, userId, organizationId);
    if (role !== 'admin') return errorJson('Apenas administradores podem alterar a marca da organização.', 403);

    const rows = await db`
      update public.organizations
      set name = ${name},
        brand_primary_color = ${primaryColor || null},
        brand_accent_color = ${accentColor || null},
        brand_login_kicker = ${loginKicker || null},
        brand_login_headline = ${loginHeadline || null},
        brand_login_description = ${loginDescription || null}
      where id = ${organizationId}::uuid
      returning id, name, slug, brand_logo_path, brand_primary_color, brand_accent_color,
        brand_login_banner_path, brand_login_kicker, brand_login_headline, brand_login_description
    `;
    if (!rows.length) return errorJson('Organização não encontrada.', 404);

    return json({ data: { organization: rows[0] } });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

function readNullableString(value: unknown): string | null | 'invalid' {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return 'invalid';
  const normalized = value.trim();
  return normalized || null;
}

function readLimitedString(value: unknown, maxLength: number): string | null | 'invalid' {
  const normalized = readNullableString(value);
  if (normalized === 'invalid') return 'invalid';
  if (normalized && normalized.length > maxLength) return 'invalid';
  return normalized;
}

function readNullableHex(value: unknown): string | null | 'invalid' {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return 'invalid';
  return normalizeHex(value) ?? 'invalid';
}
