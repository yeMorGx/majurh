import { getAuthenticatedClient } from '@/lib/api/auth';
import {
  errorJson,
  isRecord,
  isUuid,
  json,
  supabaseErrorResponse,
} from '@/lib/api/http';
import {
  processSelect,
  type ProcessStatus,
  type WithdrawalReasonCode,
} from '@/lib/processes/constants';
import { parseProcessPayload, validateWithdrawalState } from '@/lib/processes/validation';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

type ProcessRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: ProcessRouteContext) {
  return withProcessContext(request, context, async ({ supabase, organizationId, id }) => {
    const { data, error } = await supabase
      .from('recruitment_processes')
      .select(processSelect)
      .eq('organization_id', organizationId)
      .eq('id', id)
      .single();

    if (error) {
      return supabaseErrorResponse(error, {
        notFoundMessage: 'Processo seletivo não encontrado.',
      });
    }

    return json({ data });
  });
}

export async function PATCH(request: NextRequest, context: ProcessRouteContext) {
  return withProcessContext(request, context, async ({ supabase, organizationId, id }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorJson('O corpo da requisição deve ser um JSON válido.', 400);
    }

    if (!isRecord(body)) {
      return errorJson('O corpo da requisição deve ser um objeto JSON.', 400);
    }

    const parsed = parseProcessPayload(body, 'update');
    if (!parsed.ok) {
      return json({ error: 'Dados do processo inválidos.', fields: parsed.errors }, 400);
    }

    if (Object.keys(parsed.data).length === 0) {
      return errorJson('Informe ao menos um campo para atualizar.', 400);
    }

    const { data: currentData, error: currentError } = await supabase
      .from('recruitment_processes')
      .select(processSelect)
      .eq('organization_id', organizationId)
      .eq('id', id)
      .single();

    if (currentError) {
      return supabaseErrorResponse(currentError, {
        notFoundMessage: 'Processo seletivo não encontrado.',
      });
    }

    const current = currentData as unknown as {
      status: ProcessStatus;
      withdrawal_reason_code: WithdrawalReasonCode | null;
    };
    const nextStatus = parsed.data.status ?? current.status;
    const nextReason = Object.prototype.hasOwnProperty.call(
      parsed.data,
      'withdrawal_reason_code',
    )
      ? parsed.data.withdrawal_reason_code
      : current.withdrawal_reason_code;
    const withdrawalError = validateWithdrawalState(nextStatus, nextReason);
    if (withdrawalError) {
      return errorJson(withdrawalError, 400);
    }

    const { data, error } = await supabase
      .from('recruitment_processes')
      .update(parsed.data)
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select(processSelect)
      .single();

    if (error) {
      return supabaseErrorResponse(error, {
        foreignKeyMessage: 'Vaga ou responsável não encontrado.',
        constraintMessage: 'Um processo withdrawn precisa de um motivo de desistência.',
        notFoundMessage: 'Processo seletivo não encontrado.',
      });
    }

    return json({ data });
  });
}

async function withProcessContext(
  request: NextRequest,
  context: ProcessRouteContext,
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
      return errorJson('Informe um id de processo válido.', 400);
    }

    const { supabase, userId } = await getAuthenticatedClient();
    if (!userId) {
      return errorJson('É necessário estar autenticado.', 401);
    }

    return handler({ supabase, organizationId, id });
  } catch (error) {
    return supabaseErrorResponse(error, {
      notFoundMessage: 'Processo seletivo não encontrado.',
    });
  }
}
