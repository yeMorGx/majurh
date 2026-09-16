import { auth } from '@/lib/auth/server';
import { getAdminContext } from '@/lib/api/admin-context';
import { databaseErrorResponse, errorJson, isRecord, json } from '@/lib/api/http';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

type AppRole = 'admin' | 'manager' | 'recruiter' | 'viewer';
const editableRoles: AppRole[] = ['admin', 'manager', 'recruiter', 'viewer'];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const context = await getAdminContext();
    if ('response' in context) return context.response;
    const { userId } = await params;
    if (!userId) return errorJson('Usuário inválido.', 400);

    let body: unknown;
    try { body = await request.json(); } catch { return errorJson('O corpo da requisição deve ser um JSON válido.', 400); }
    if (!isRecord(body)) return errorJson('Informe as alterações do acesso.', 400);

    const members = await context.db`
      select user_id, role
      from public.organization_members
      where organization_id = ${context.organizationId}::uuid and user_id = ${userId}
      limit 1
    ` as Array<{ user_id: string; role: AppRole }>;
    const member = members[0];
    if (!member) return errorJson('Esta pessoa não pertence à organização.', 404);

    const nextRole = typeof body.role === 'string' && editableRoles.includes(body.role as AppRole) ? body.role as AppRole : null;
    const password = typeof body.password === 'string' ? body.password : '';
    if (!nextRole && !password) return errorJson('Informe um novo papel ou uma nova senha.', 400);
    if (password && (password.length < 8 || password.length > 128)) return errorJson('A senha deve ter entre 8 e 128 caracteres.', 400);
    if (nextRole === 'admin' && member.role !== 'admin') {
      // A promoção é permitida; a proteção abaixo evita remover o último administrador.
    }
    if (nextRole && member.role === 'admin' && nextRole !== 'admin') {
      const admins = await context.db`
        select count(*)::int as count from public.organization_members
        where organization_id = ${context.organizationId}::uuid and role = 'admin'::public.app_role
      ` as Array<{ count: number }>;
      if ((admins[0]?.count ?? 0) <= 1) return errorJson('A organização precisa manter pelo menos um administrador.', 409);
    }

    if (password) {
      const result = await auth.admin.setUserPassword({ userId, newPassword: password });
      if (result.error) return errorJson('Não foi possível trocar a senha no Neon Auth.', 400);
    }
    if (nextRole && nextRole !== member.role) {
      await context.db`
        update public.organization_members
        set role = ${nextRole}::public.app_role
        where organization_id = ${context.organizationId}::uuid and user_id = ${userId}
      `;
    }

    return json({ data: { userId, role: nextRole ?? member.role, passwordChanged: Boolean(password) } });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const context = await getAdminContext();
    if ('response' in context) return context.response;
    const { userId } = await params;
    if (!userId || userId === context.userId) return errorJson('Você não pode remover o próprio acesso por aqui.', 400);

    const members = await context.db`
      select user_id, role from public.organization_members
      where organization_id = ${context.organizationId}::uuid and user_id = ${userId}
      limit 1
    ` as Array<{ user_id: string; role: AppRole }>;
    if (!members.length) return errorJson('Esta pessoa não pertence à organização.', 404);

    const removed = await context.db`
      delete from public.organization_members
      where organization_id = ${context.organizationId}::uuid and user_id = ${userId}
      returning user_id
    ` as Array<{ user_id: string }>;
    if (!removed.length) return errorJson('O acesso já não está vinculado a esta organização.', 404);

    // A expulsão do espaço não depende da exclusão da conta no Neon Auth.
    // Isso também cobre contas migradas cujo user_id não é o ID atual do Auth.
    let authAccountRemoved = false;
    try {
      const result = await auth.admin.removeUser({ userId });
      authAccountRemoved = !result.error;
    } catch {
      // A pessoa já perdeu o acesso à organização; a conta pode ser limpa depois.
    }
    return json({ data: { userId, removed: true, authAccountRemoved } });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
