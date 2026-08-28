import { getAuthenticatedClient } from '@/lib/api/auth';
import {
  errorJson,
  isUuid,
  json,
  supabaseErrorResponse,
} from '@/lib/api/http';
import { processSelect, processStatuses } from '@/lib/processes/constants';
import { parseProcessPayload, validateWithdrawalState } from '@/lib/processes/validation';
import type { TablesInsert } from '@/types/database.types';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    if (!isUuid(organizationId)) {
      return errorJson('Informe um organizationId válido.', 400);
    }

    const { supabase, userId } = await getAuthenticatedClient();
    if (!userId) {
      return errorJson('É necessário estar autenticado.', 401);
    }

    const candidateId = request.nextUrl.searchParams.get('candidateId');
    if (candidateId && !isUuid(candidateId)) {
      return errorJson('Informe um candidateId válido.', 400);
    }

    const status = request.nextUrl.searchParams.get('status');
    if (status && !processStatuses.includes(status as (typeof processStatuses)[number])) {
      return errorJson('Informe um status de processo válido.', 400);
    }

    const page = parsePositiveInteger(request.nextUrl.searchParams.get('page'), 1);
    const pageSize = Math.min(
      parsePositiveInteger(
        request.nextUrl.searchParams.get('pageSize'),
        DEFAULT_PAGE_SIZE,
      ),
      MAX_PAGE_SIZE,
    );
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('recruitment_processes')
      .select(processSelect, { count: 'exact' })
      .eq('organization_id', organizationId);

    if (candidateId) {
      query = query.eq('candidate_id', candidateId);
    }

    if (status) {
      query = query.eq('status', status as (typeof processStatuses)[number]);
    }

    const { data, error, count } = await query
      .order('started_at', { ascending: false })
      .range(from, to);

    if (error) {
      return supabaseErrorResponse(error, {
        notFoundMessage: 'Nenhum processo encontrado.',
      });
    }

    return json({
      data: data ?? [],
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
        totalPages: count ? Math.ceil(count / pageSize) : 0,
      },
    });
  } catch (error) {
    return supabaseErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorJson('O corpo da requisição deve ser um JSON válido.', 400);
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return errorJson('O corpo da requisição deve ser um objeto JSON.', 400);
    }

    const organizationId = (body as Record<string, unknown>).organizationId;
    if (!isUuid(organizationId)) {
      return errorJson('Informe um organizationId válido.', 400);
    }

    const { supabase, userId } = await getAuthenticatedClient();
    if (!userId) {
      return errorJson('É necessário estar autenticado.', 401);
    }

    const payload = Object.fromEntries(
      Object.entries(body).filter(([key]) => key !== 'organizationId'),
    );
    const parsed = parseProcessPayload(payload, 'create');
    if (!parsed.ok) {
      return json({ error: 'Dados do processo inválidos.', fields: parsed.errors }, 400);
    }

    const withdrawalError = validateWithdrawalState(
      parsed.data.status,
      parsed.data.withdrawal_reason_code,
    );
    if (withdrawalError) {
      return errorJson(withdrawalError, 400);
    }

    const processInsert = {
      organization_id: organizationId,
      ...parsed.data,
    } as TablesInsert<'recruitment_processes'>;

    const { data, error } = await supabase
      .from('recruitment_processes')
      .insert(processInsert)
      .select(processSelect)
      .single();

    if (error) {
      return supabaseErrorResponse(error, {
        duplicateMessage: 'Este processo seletivo já existe.',
        foreignKeyMessage: 'Candidato, vaga ou responsável não encontrado.',
        constraintMessage: 'Um processo withdrawn precisa de um motivo de desistência.',
      });
    }

    return json({ data }, 201);
  } catch (error) {
    return supabaseErrorResponse(error);
  }
}

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
