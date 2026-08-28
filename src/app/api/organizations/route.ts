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

    if (!isRecord(body) || typeof body.name !== 'string') {
      return errorJson('Informe o nome da organização.', 400);
    }

    const name = body.name.trim();
    if (name.length < 2 || name.length > 120) {
      return errorJson('O nome da organização deve ter entre 2 e 120 caracteres.', 400);
    }

    const { supabase, userId } = await getAuthenticatedClient();
    if (!userId) {
      return errorJson('É necessário estar autenticado.', 401);
    }

    const { data, error } = await supabase
      .rpc('create_organization_for_current_user', { requested_name: name })
      .single();

    if (error) {
      if (error.code === '42501') {
        return errorJson('Seu usuário já possui um vínculo ou não pode criar outra organização.', 409);
      }
      if (error.code === '23514') {
        return errorJson('O nome da organização não atende às regras do sistema.', 400);
      }
      return supabaseErrorResponse(error);
    }

    return json({
      data: {
        organization: {
          id: data.organization_id,
          name: data.organization_name,
          slug: data.organization_slug,
        },
        membership: { role: data.organization_role },
      },
    });
  } catch (error) {
    return supabaseErrorResponse(error);
  }
}
