import { auth } from '@/lib/auth/server';
import { databaseErrorResponse, errorJson, findMembershipsByEmail, getAdminContext, isRecord, json } from '@/lib/api';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
type AppRole = 'manager' | 'recruiter' | 'viewer';

export async function GET() {
  try {
    const context = await getAdminContext();
    if ('response' in context) return context.response;
    const members = await context.db`
      select om.user_id, om.email, om.role, om.created_at,
        coalesce(nullif(p.full_name, ''), nullif(lau.full_name, ''), 'Membro da equipe') as full_name
      from public.organization_members om
      left join public.profiles p on p.id = om.user_id
      left join public.legacy_auth_users lau on lau.id = om.user_id
      where om.organization_id = ${context.organizationId}::uuid
      order by om.created_at asc
    `;
    return json({ data: { organization: context.organization, members } });
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
    const role: AppRole | null = body.role === 'viewer' ? 'viewer' : body.role === 'manager' ? 'manager' : body.role === 'recruiter' || body.role === undefined ? 'recruiter' : null;
    if (name.length < 2 || name.length > 120) return errorJson('Informe o nome completo (de 2 a 120 caracteres).', 400);
    if (!isValidEmail(email)) return errorJson('Informe um e-mail válido.', 400);
    if (password.length < 8 || password.length > 128) return errorJson('A senha deve ter entre 8 e 128 caracteres.', 400);
    if (!role) return errorJson('Escolha um papel válido para o novo acesso.', 400);

    const context = await getAdminContext();
    if ('response' in context) return context.response;
    const existingMembers = await findMembershipsByEmail(context.db, email);
    const otherOrganization = existingMembers.find((member) => member.organization_id !== context.organizationId);
    if (otherOrganization) return json({ error: `Este e-mail já está vinculado à organização "${otherOrganization.organization_name}". Uma pessoa só pode pertencer a uma organização.`, code: 'EMAIL_ALREADY_IN_ORGANIZATION' }, 409);
    if (existingMembers.some((member) => member.organization_id === context.organizationId)) return errorJson('Este e-mail já faz parte da organização.', 409);

    const created = await auth.admin.createUser({ email, password, name });
    if (created.error || !created.data?.user?.id) return errorJson(authCreateErrorMessage(created.error), authCreateErrorStatus(created.error));
    const authUserId = created.data.user.id;

    try {
      await context.db`insert into public.profiles (id, full_name) values (${authUserId}, ${name}) on conflict (id) do update set full_name = excluded.full_name`;
      await context.db`insert into public.organization_members (organization_id, user_id, email, role) values (${context.organizationId}::uuid, ${authUserId}, ${email}, ${role}::public.app_role) on conflict (organization_id, user_id) do update set email = excluded.email, role = excluded.role`;
    } catch (error) {
      try { await auth.admin.removeUser({ userId: authUserId }); } catch { /* preserve o erro do banco */ }
      throw error;
    }

    return json({ data: { user: { id: authUserId, name, email, role }, organization: context.organization } }, 201);
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
