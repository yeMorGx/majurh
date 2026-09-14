import { getAuthenticatedClient } from '@/lib/api/auth';
import { databaseErrorResponse, errorJson, isRecord, json } from '@/lib/api/http';
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
        returning id, name, slug
      ), created_member as (
        insert into public.organization_members (organization_id, user_id, role)
        select id, ${userId}, 'admin'::public.app_role
        from created_organization
        returning role
      )
      select created_organization.id, created_organization.name, created_organization.slug,
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
        },
        membership: { role: organization.role },
      },
    });
  } catch (error) {
    return databaseErrorResponse(error);
  }
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
