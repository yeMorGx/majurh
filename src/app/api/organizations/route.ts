import { randomUUID } from 'node:crypto';

import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import { findMembershipByEmail } from '@/lib/api/member-email';
import { databaseErrorResponse, errorJson, isRecord, json } from '@/lib/api/http';
import { normalizeHex } from '@/lib/branding';
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

    const { db, userId, authUserId, email } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    const ownerUserId = authUserId ?? userId;

    const memberships = await db`
      select o.id, o.name, o.slug, om.role
      from public.organization_members om
      join public.organizations o on o.id = om.organization_id
      where om.user_id = ${userId}
      order by om.created_at asc
      limit 1
    ` as Array<{ id: string; name: string; slug: string; role: 'admin' | 'recruiter' | 'viewer' }>;
    const membershipByEmail = email ? await findMembershipByEmail(db, email) : null;
    const existingMembership = memberships[0]
      ? memberships[0]
      : membershipByEmail
        ? {
            id: membershipByEmail.organization_id,
            name: membershipByEmail.organization_name,
            slug: '',
            role: membershipByEmail.role,
          }
        : null;
    if (existingMembership) {
      return json({
        error: 'Este usuário já está associado a uma organização.',
        code: 'ORGANIZATION_EXISTS',
        data: {
          organization: {
            id: existingMembership.id,
            name: existingMembership.name,
            slug: existingMembership.slug,
          },
          membership: { role: existingMembership.role },
        },
      }, 409);
    }

    const baseSlug = slugify(name);
    const existingSlugs = await db`
      select slug from public.organizations
      where slug = ${baseSlug} or slug like ${`${baseSlug}-%`}
    ` as Array<{ slug: string }>;
    const slug = uniqueSlug(baseSlug, new Set(existingSlugs.map((row) => row.slug)));

    const organizationRows = await db`
      insert into public.organizations (name, slug)
      values (${name}, ${slug})
      returning id, name, slug, brand_logo_path, brand_primary_color, brand_accent_color,
        brand_login_banner_path, brand_login_kicker, brand_login_headline, brand_login_description
    `;
    const organization = organizationRows[0];
    if (!organization) return errorJson('Não foi possível criar a organização.', 500);

    try {
      await db`
        insert into public.organization_members (organization_id, user_id, email, role)
        values (${organization.id}::uuid, ${ownerUserId}, ${email}, 'admin'::public.app_role)
      `;
    } catch (error) {
      // Não deixa uma organização vazia se o vínculo inicial falhar.
      try {
        await db`delete from public.organizations where id = ${organization.id}::uuid`;
      } catch {
        // Mantém o erro original para que a resposta explique o problema real.
      }
      throw error;
    }

    return json({
      data: {
        organization,
        membership: { role: 'admin' },
      },
    }, 201);
  } catch (error) {
    return databaseErrorResponse(error, { duplicateMessage: 'Esse endereço de organização já está em uso.' });
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

function slugify(value: string) {
  const normalized = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const slug = normalized.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72);
  return slug || 'organizacao';
}

function uniqueSlug(baseSlug: string, existing: Set<string>) {
  if (!existing.has(baseSlug)) return baseSlug;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${baseSlug.slice(0, 63)}-${randomUUID().slice(0, 8)}`;
    if (!existing.has(candidate)) return candidate;
  }

  return `${baseSlug.slice(0, 58)}-${Date.now().toString(36)}`;
}
