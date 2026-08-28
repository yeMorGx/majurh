import { getAuthenticatedClient } from '@/lib/api/auth';
import { errorJson, isRecord, isUuid, json, supabaseErrorResponse } from '@/lib/api/http';
import { vacancySelect } from '@/lib/vacancies/constants';
import { parseVacancyPayload } from '@/lib/vacancies/validation';
import type { TablesInsert } from '@/types/database.types';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    if (!isUuid(organizationId)) return errorJson('Informe um organizationId válido.', 400);
    const { supabase, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    let query = supabase.from('vacancies').select(vacancySelect).eq('organization_id', organizationId);
    if (request.nextUrl.searchParams.get('activeOnly') !== 'false') query = query.eq('is_active', true);
    const { data, error } = await query.order('title', { ascending: true });
    if (error) return supabaseErrorResponse(error);
    return json({ data: data ?? [] });
  } catch (error) { return supabaseErrorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return errorJson('O corpo da requisição deve ser um JSON válido.', 400); }
    if (!isRecord(body) || !isUuid(body.organizationId)) return errorJson('Informe um organizationId válido.', 400);
    const { supabase, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    const payload = Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'organizationId'));
    const parsed = parseVacancyPayload(payload, 'create');
    if (!parsed.ok) return json({ error: 'Dados da vaga inválidos.', fields: parsed.errors }, 400);
    const vacancyInsert = {
      organization_id: body.organizationId,
      ...parsed.data,
    } as TablesInsert<'vacancies'>;
    const { data, error } = await supabase.from('vacancies').insert(vacancyInsert).select(vacancySelect).single();
    if (error) return supabaseErrorResponse(error, { duplicateMessage: 'Esta vaga já existe nesta organização.' });
    return json({ data }, 201);
  } catch (error) { return supabaseErrorResponse(error); }
}
