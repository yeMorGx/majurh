import { getAuthenticatedClient } from '@/lib/api/auth';
import {
  errorJson,
  isRecord,
  isUuid,
  json,
  supabaseErrorResponse,
} from '@/lib/api/http';
import { candidateSelect } from '@/lib/candidates/constants';
import { parseCandidatePayload } from '@/lib/candidates/validation';
import type { TablesUpdate } from '@/types/database.types';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

type CandidateRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: CandidateRouteContext) {
  return withCandidateContext(request, context, async ({ supabase, organizationId, id }) => {
    const { data, error } = await supabase
      .from('candidates')
      .select(candidateSelect)
      .eq('organization_id', organizationId)
      .eq('id', id)
      .single();

    if (error) {
      return supabaseErrorResponse(error);
    }

    return json({ data });
  });
}

export async function PATCH(request: NextRequest, context: CandidateRouteContext) {
  return withCandidateContext(request, context, async ({ supabase, organizationId, id }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorJson('O corpo da requisição deve ser um JSON válido.', 400);
    }

    const parsed = parseCandidatePayload(body, 'update');
    if (!parsed.ok) {
      return json({ error: 'Dados do candidato inválidos.', fields: parsed.errors }, 400);
    }

    if (Object.keys(parsed.data).length === 0) {
      return errorJson('Informe ao menos um campo para atualizar.', 400);
    }

    const candidateUpdate = parsed.data as TablesUpdate<'candidates'>;

    const { data, error } = await supabase
      .from('candidates')
      .update(candidateUpdate)
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select(candidateSelect)
      .single();

    if (error) {
      return supabaseErrorResponse(error);
    }

    return json({ data });
  });
}

export async function DELETE(request: NextRequest, context: CandidateRouteContext) {
  return withCandidateContext(request, context, async ({ supabase, organizationId, id }) => {
    const { data, error } = await supabase
      .from('candidates')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      return supabaseErrorResponse(error);
    }

    if (!data) {
      return errorJson('Candidato não encontrado.', 404);
    }

    return json({ data: { id } });
  });
}

async function withCandidateContext(
  request: NextRequest,
  context: CandidateRouteContext,
  handler: (context: {
    supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>['supabase'];
    organizationId: string;
    id: string;
  }) => Promise<Response>,
) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    const { id } = await context.params;

    if (!isUuid(organizationId)) {
      return errorJson('Informe um organizationId válido.', 400);
    }

    if (!isUuid(id)) {
      return errorJson('Informe um id de candidato válido.', 400);
    }

    const { supabase, userId } = await getAuthenticatedClient();
    if (!userId) {
      return errorJson('É necessário estar autenticado.', 401);
    }

    return handler({ supabase, organizationId, id });
  } catch (error) {
    return supabaseErrorResponse(error);
  }
}
