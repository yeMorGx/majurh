import { getAuth } from '@/lib/auth/server';
import { databaseErrorResponse, errorJson, getAdminContext, isRecord, json } from '@/lib/api';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const context = await getAdminContext();
    if ('response' in context) return context.response;

    const members = await context.db`
      select user_id, email, full_name, is_active, created_at
      from public.site_access_users
      order by is_active desc, created_at asc
    `;

    return json({ data: { scope: context.scope, members } });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return errorJson('O corpo da requisição deve ser um JSON válido.', 400); }
    if (!isRecord(body)) return errorJson('Informe os dados do novo acesso.', 400);

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (name.length < 2 || name.length > 120) return errorJson('Informe o nome completo (de 2 a 120 caracteres).', 400);
    if (!isValidEmail(email)) return errorJson('Informe um e-mail válido.', 400);
    if (password.length < 8 || password.length > 128) return errorJson('A senha deve ter entre 8 e 128 caracteres.', 400);

    const context = await getAdminContext();
    if ('response' in context) return context.response;

    const existingAccess = await context.db`
      select user_id, is_active
      from public.site_access_users
      where lower(btrim(email)) = lower(btrim(${email}))
      limit 1
    ` as Array<{ user_id: string; is_active: boolean }>;
    if (existingAccess[0]) {
      return errorJson(
        existingAccess[0].is_active
          ? 'Este e-mail já possui acesso ao Majurh.'
          : 'Este e-mail possui um acesso revogado. Reative ou altere o e-mail antes de criar outro acesso.',
        409,
      );
    }

    const created = await getAuth().admin.createUser({ email, password, name });
    if (created.error || !created.data?.user?.id) {
      return errorJson(authCreateErrorMessage(created.error), authCreateErrorStatus(created.error));
    }

    const authUserId = created.data.user.id;
    try {
      await context.db`
        insert into public.profiles (id, full_name)
        values (${authUserId}, ${name})
        on conflict (id) do update set full_name = excluded.full_name
      `;
      await context.db`
        insert into public.site_access_users (user_id, email, full_name, is_active, created_by)
        values (${authUserId}, ${email}, ${name}, true, ${context.userId})
      `;
    } catch (error) {
      try { await context.db`delete from public.profiles where id = ${authUserId}`; } catch { /* preserva o erro original */ }
      try { await getAuth().admin.removeUser({ userId: authUserId }); } catch { /* preserva o erro do banco */ }
      throw error;
    }

    return json({
      data: {
        user: { id: authUserId, name, email, isActive: true },
        scope: 'global',
        organizationCreatedByUser: true,
      },
    }, 201);
  } catch (error) {
    return databaseErrorResponse(error, 'Este e-mail já possui um acesso.');
  }
}

function isValidEmail(value: string) { return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value); }
function authCreateErrorStatus(error: unknown) {
  const status = error && typeof error === 'object' && 'status' in error ? Number((error as { status?: unknown }).status) : 0;
  return status === 409 || status === 422 ? status : 400;
}
function authCreateErrorMessage(error: unknown) {
  const details = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const code = typeof details.code === 'string' ? details.code.toLowerCase() : '';
  const message = typeof details.message === 'string' ? details.message.toLowerCase() : '';
  if (code.includes('already') || message.includes('already') || message.includes('exists')) return 'Este e-mail já possui um acesso no Neon Auth.';
  if (code.includes('admin') || message.includes('forbidden') || message.includes('not allowed')) return 'Sua conta não tem permissão de administrador no Neon Auth.';
  if (code.includes('invalid_email') || message.includes('invalid email')) return 'Informe um e-mail válido.';
  return 'Não foi possível criar o acesso no Neon Auth.';
}
