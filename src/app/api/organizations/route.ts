import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import { databaseErrorResponse, errorJson, isRecord, json } from '@/lib/api/http';
import { isSafeLogoUrl, normalizeHex } from '@/lib/branding';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorJson('O corpo da requisição deve ser um JSON válido.', 400);
    }

    if (!isRecord(body) || typeof body.name !== 'string') {
      return errorJson('Informe o nome da organização.', 400);
    }

    const name = body.name.trim();
    if (name.length < 2 || name.length > 120) {
      return errorJson('O nome da organização deve ter entre 2 e 120 caracteres.', 400);
    }

    const { db, userId } = await getAuthenticatedClient();
    if (!userId) {
      return errorJson('É necessário estar autenticado.', 401);
    }

    const existingMembership = await db`
      select 1 from public.organization_members where user_id = ${userId} limit 1
    `;
    if (existingMembership.length) {
      return errorJson('Seu usuário já está associado a uma organização.', 409);
    }

    const baseSlug = slugify(name);
    let slug = baseSlug;
    let suffix = 0;
    while (true) {
      const existingSlug = await db`
        select 1 from public.organizations where slug = ${slug} limit 1
      `;
      if (!existingSlug.length) break;
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    const rows = await db`
      with created_organization as (
        insert into public.organizations (name, slug)
        values (${name}, ${slug})
        returning id, name, slug, brand_logo_url, brand_primary_color, brand_accent_color
      ), created_member as (
        insert into public.organization_members (organization_id, user_id, role)
        select id, ${userId}, 'admin'::public.app_role
        from created_organization
        returning role
      )
      select created_organization.id, created_organization.name, created_organization.slug,
        created_organization.brand_logo_url, created_organization.brand_primary_color,
        created_organization.brand_accent_color,
        created_member.role
      from created_organization cross join created_member
    `;

    const organization = rows[0];
    return json({
      data: {
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          brand_logo_url: organization.brand_logo_url,
          brand_primary_color: organization.brand_primary_color,
          brand_accent_color: organization.brand_accent_color,
        },
        membership: { role: organization.role },
      },
    });
  } catch (error) {
    return databaseErrorResponse(error);
  }
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

    const logoValue = readNullableString(body.brandLogoUrl);
    if (logoValue === 'invalid') return errorJson('Informe uma URL de logo válida ou deixe o campo vazio.', 400);
    if (logoValue && !isSafeLogoUrl(logoValue)) return errorJson('A logo deve usar um caminho local ou uma URL HTTPS.', 400);

    const primaryColor = readNullableHex(body.brandPrimaryColor);
    const accentColor = readNullableHex(body.brandAccentColor);
    if (primaryColor === 'invalid' || accentColor === 'invalid') return errorJson('As cores devem estar no formato hexadecimal, por exemplo #0f4d3a.', 400);

    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    const role = await getOrganizationRole(db, userId, organizationId);
    if (role !== 'admin') return errorJson('Apenas administradores podem alterar a marca da organização.', 403);

    const rows = await db`
      update public.organizations
      set name = ${name},
        brand_logo_url = ${logoValue || null},
        brand_primary_color = ${primaryColor || null},
        brand_accent_color = ${accentColor || null}
      where id = ${organizationId}::uuid
      returning id, name, slug, brand_logo_url, brand_primary_color, brand_accent_color
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

function readNullableHex(value: unknown): string | null | 'invalid' {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return 'invalid';
  return normalizeHex(value) ?? 'invalid';
}

function slugify(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return normalized || 'organizacao';
}
