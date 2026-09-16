import { getAdminSession } from '@/lib/admin-session';
import { getDatabase, type DatabaseClient } from '@/lib/neon/db';
import { NextResponse } from 'next/server';

export function json<T>(body: T, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function errorJson(message: string, status: number) {
  return json({ error: message }, status);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function databaseErrorResponse(error: unknown, duplicateMessage = 'Já existe um acesso com estes dados.') {
  const code = isRecord(error) && typeof error.code === 'string' ? error.code : undefined;
  if (code === '23505') return errorJson(duplicateMessage, 409);
  if (code === '42703' || code === '42P01' || code === '42883') {
    return errorJson('O banco ainda não está alinhado com este console. Execute as migrações do Neon.', 503);
  }
  if (error instanceof Error && error.message.startsWith('Variável de ambiente obrigatória ausente:')) {
    return errorJson('O banco de dados ou o Neon Auth não está configurado neste ambiente.', 503);
  }
  return errorJson('Não foi possível concluir a operação.', 500);
}

export type OrganizationContext = {
  db: DatabaseClient;
  userId: string;
  email: string | null;
  organizationId: string;
  organization: { name: string; slug: string };
  scope: 'global';
};

export async function getAdminContext(): Promise<OrganizationContext | { response: Response }> {
  const session = await getAdminSession();
  if (!session) return { response: errorJson('É necessário estar autenticado no console administrativo.', 401) };
  const { db, userId, email } = session;

  const admins = await db`
    select user_id
    from public.site_admins
    where is_active = true
      and (user_id = ${userId} or lower(email) = lower(coalesce(${email}, '')))
    limit 1
  ` as Array<{ user_id: string }>;
  if (!admins[0]) return { response: errorJson('Apenas administradores globais podem abrir este console.', 403) };

  const memberships = await db`
    select id as organization_id, name, slug
    from public.organizations
    order by created_at asc
    limit 1
  ` as Array<{ organization_id: string; name: string; slug: string }>;
  const membership = memberships[0];
  if (!membership) return { response: errorJson('Crie uma organização no Majurh antes de administrar o produto.', 503) };

  return {
    db,
    userId,
    email,
    organizationId: membership.organization_id,
    organization: { name: membership.name, slug: membership.slug },
    scope: 'global',
  };
}

export type MemberEmail = {
  organization_id: string;
  organization_name: string;
  user_id: string;
  email: string | null;
  role: 'admin' | 'manager' | 'recruiter' | 'viewer';
};

export async function findMembershipsByEmail(db: DatabaseClient, email: string) {
  return await db`
    select om.organization_id, o.name as organization_name, om.user_id, om.email, om.role
    from public.organization_members om
    join public.organizations o on o.id = om.organization_id
    left join public.legacy_auth_users lau on lau.id = om.user_id
    where lower(coalesce(nullif(btrim(om.email), ''), nullif(btrim(lau.email), ''))) = lower(btrim(${email}))
    order by om.created_at asc
  ` as MemberEmail[];
}
