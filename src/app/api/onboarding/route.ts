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

    if (!isRecord(body) || typeof body.fullName !== 'string') {
      return errorJson('Informe seu nome completo.', 400);
    }

    const fullName = body.fullName.trim();
    if (fullName.length < 2 || fullName.length > 120) {
      return errorJson('O nome deve ter entre 2 e 120 caracteres.', 400);
    }

    const { db, userId, email } = await getAuthenticatedClient();
    if (!userId) {
      return errorJson('É necessário estar autenticado.', 401);
    }

    const memberships = await db`
      select 1
      from public.organization_members
      where user_id = ${userId}
      limit 1
    `;
    if (!memberships.length) {
      return errorJson('Seu acesso só pode ser concluído por um convite de organização.', 403);
    }

    const rows = await db`
      insert into public.profiles (id, full_name)
      values (${userId}, ${fullName})
      on conflict (id) do update set full_name = excluded.full_name
      returning id, full_name, avatar_url
    `;

    return json({ data: { profile: rows[0], user: { id: userId, email } } });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
