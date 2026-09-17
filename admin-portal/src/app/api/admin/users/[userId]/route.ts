import { databaseErrorResponse, errorJson, getAdminContext, isRecord, json } from '@/lib/api';
import { hashNeonAuthPassword } from '@/lib/neon-auth-password';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const context = await getAdminContext();
    if ('response' in context) return context.response;
    const { userId } = await params;
    if (!userId) return errorJson('Usuário inválido.', 400);

    let body: unknown;
    try { body = await request.json(); } catch { return errorJson('O corpo da requisição deve ser um JSON válido.', 400); }
    if (!isRecord(body)) return errorJson('Informe as alterações do acesso.', 400);

    const password = typeof body.password === 'string' ? body.password : '';
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : null;
    if (!password && isActive === null) return errorJson('Informe uma nova senha ou o estado do acesso.', 400);
    if (password && (password.length < 8 || password.length > 128)) return errorJson('A senha deve ter entre 8 e 128 caracteres.', 400);

    const accessRows = await context.db`
      select user_id, is_active
      from public.site_access_users
      where user_id = ${userId}
      limit 1
    ` as Array<{ user_id: string; is_active: boolean }>;
    const access = accessRows[0];
    if (!access) return errorJson('Este acesso geral não foi encontrado.', 404);

    if (password) {
      const passwordHash = await hashNeonAuthPassword(password);
      const updatedAccounts = await context.db`
        update neon_auth.account
        set password = ${passwordHash}, "updatedAt" = now()
        where "userId" = ${userId}::uuid and "providerId" = 'credential'
        returning "userId"
      ` as Array<{ userId: string }>;
      if (!updatedAccounts.length) return errorJson('A conta de autenticação não foi encontrada.', 404);
    }
    if (isActive !== null) {
      await context.db`update public.site_access_users set is_active = ${isActive} where user_id = ${userId}`;
    }

    return json({ data: { userId, isActive: isActive ?? access.is_active, passwordChanged: Boolean(password) } });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const context = await getAdminContext();
    if ('response' in context) return context.response;
    const { userId } = await params;
    if (!userId || userId === context.userId) return errorJson('Você não pode revogar o próprio acesso por aqui.', 400);

    const revoked = await context.db`
      update public.site_access_users
      set is_active = false
      where user_id = ${userId} and is_active = true
      returning user_id
    ` as Array<{ user_id: string }>;
    if (!revoked.length) return errorJson('Este acesso já está revogado ou não foi encontrado.', 404);
    return json({ data: { userId, revoked: true, accountPreserved: true } });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
