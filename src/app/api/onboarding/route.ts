import { getAuthenticatedClient } from '@/lib/api/auth';
import { errorJson, isRecord, json, supabaseErrorResponse } from '@/lib/api/http';
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

    const { supabase, userId, email } = await getAuthenticatedClient();
    if (!userId) {
      return errorJson('É necessário estar autenticado.', 401);
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, full_name: fullName }, { onConflict: 'id' })
      .select('id, full_name, avatar_url')
      .single();

    if (error) {
      return supabaseErrorResponse(error);
    }

    return json({
      data: {
        profile: data,
        user: { id: userId, email },
      },
    });
  } catch (error) {
    return supabaseErrorResponse(error);
  }
}
