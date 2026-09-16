import { NextRequest } from 'next/server';
import { databaseErrorResponse, errorJson, isRecord, json } from '@/lib/api';
import { createAdminSession, attachAdminSession, verifyPassword } from '@/lib/admin-session';
import { getDatabase } from '@/lib/neon/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return errorJson('O corpo da requisição deve ser um JSON válido.', 400); }
    if (!isRecord(body)) return errorJson('Informe e-mail e senha.', 400);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password) return errorJson('Informe e-mail e senha.', 400);

    const db = getDatabase();
    const admins = await db`
      select user_id, email, coalesce(nullif(full_name, ''), 'Administrador') as full_name, password_hash
      from public.site_admins
      where lower(email) = ${email} and is_active = true
      limit 1
    ` as Array<{ user_id: string; email: string; full_name: string; password_hash: string | null }>;
    const admin = admins[0];
    if (!admin?.password_hash || !verifyPassword(password, admin.password_hash)) {
      return errorJson('E-mail ou senha administrativos inválidos.', 401);
    }

    const token = await createAdminSession(db, admin.user_id);
    const response = json({ data: { user: { id: admin.user_id, email: admin.email, name: admin.full_name } } });
    attachAdminSession(response, token);
    return response;
  } catch (error) {
    return databaseErrorResponse(error, 'Não foi possível entrar no console administrativo.');
  }
}
