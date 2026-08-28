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
        // A tela de onboarding pode ter sido aberta antes de outro pedido
        // concluir a associação. Nesse caso, devolvemos o vínculo atual para
        // que o cliente recupere o contexto sem tentar criar outra organização.
        const { data: existingMembership, error: membershipError } = await supabase
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (membershipError) {
          return supabaseErrorResponse(membershipError);
        }

        if (existingMembership) {
          const { data: existingOrganization, error: organizationError } = await supabase
            .from('organizations')
            .select('id, name, slug')
            .eq('id', existingMembership.organization_id)
            .maybeSingle();

          if (organizationError) {
            return supabaseErrorResponse(organizationError);
          }

          if (existingOrganization) {
            return json(
              {
                error: 'Seu usuário já está vinculado a uma organização.',
                code: 'ORGANIZATION_EXISTS',
                data: {
                  organization: existingOrganization,
                  membership: { role: existingMembership.role },
                },
              },
              409,
            );
          }
        }

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
