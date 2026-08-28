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

    const page = parsePositiveInteger(request.nextUrl.searchParams.get('page'), 1);
    const pageSize = Math.min(
      parsePositiveInteger(
        request.nextUrl.searchParams.get('pageSize'),
        DEFAULT_PAGE_SIZE,
      ),
      MAX_PAGE_SIZE,
    );
    const search = request.nextUrl.searchParams.get('q')?.trim() ?? '';
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('candidates')
      .select(candidateSelect, { count: 'exact' })
      .eq('organization_id', organizationId);

    if (search) {
      const safeSearch = escapeSearchValue(search);
      const pattern = `%${safeSearch}%`;
      query = query.or(
        [
          `full_name.ilike.${pattern}`,
          `cpf.ilike.${pattern}`,
          `cpf_normalized.ilike.${pattern}`,
          `rg.ilike.${pattern}`,
          `phone.ilike.${pattern}`,
          `email.ilike.${pattern}`,
        ].join(','),
      );
    }

    const { data, error, count } = await query
      .order('full_name', { ascending: true })
      .range(from, to);

    if (error) {
      return supabaseErrorResponse(error);
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

    if (!isRecord(body) || !isUuid(body.organizationId)) {
      return errorJson('Informe um organizationId válido.', 400);
    }
    const organizationId = body.organizationId;

    const { supabase, userId } = await getAuthenticatedClient();
    if (!userId) {
      return errorJson('É necessário estar autenticado.', 401);
    }

    const candidateInput = Object.fromEntries(
      Object.entries(body).filter(([key]) => key !== 'organizationId'),
    );
    const parsed = parseCandidatePayload(candidateInput, 'create');
    if (!parsed.ok) {
      return json({ error: 'Dados do candidato inválidos.', fields: parsed.errors }, 400);
    }

    const candidateInsert = {
        organization_id: organizationId,
        created_by: userId,
        ...parsed.data,
      } as TablesInsert<'candidates'>;

    const { data, error } = await supabase
      .from('candidates')
      .insert(candidateInsert)
      .select(candidateSelect)
      .single();

    if (error) {
      return supabaseErrorResponse(error);
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

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, '\\$&');
}

function escapeSearchValue(value: string) {
  return escapeLikePattern(value.replace(/[(),]/g, ' '));
}
