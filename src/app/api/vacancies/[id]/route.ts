import { getAuthenticatedClient } from '@/lib/api/auth';
import { errorJson, isRecord, isUuid, json, supabaseErrorResponse } from '@/lib/api/http';
import { vacancySelect } from '@/lib/vacancies/constants';
import { parseVacancyPayload } from '@/lib/vacancies/validation';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
type VacancyContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: VacancyContext) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    const { id } = await context.params;
    if (!isUuid(organizationId) || !isUuid(id)) return errorJson('Informe organização e vaga válidas.', 400);
    const { supabase, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    let body: unknown;
    try { body = await request.json(); } catch { return errorJson('O corpo da requisição deve ser um JSON válido.', 400); }
    const parsed = parseVacancyPayload(body, 'update');
    if (!parsed.ok) return json({ error: 'Dados da vaga inválidos.', fields: parsed.errors }, 400);
    if (!Object.keys(parsed.data).length) return errorJson('Informe ao menos um campo para atualizar.', 400);
    const { data, error } = await supabase.from('vacancies').update(parsed.data).eq('organization_id', organizationId).eq('id', id).select(vacancySelect).single();
    if (error) return supabaseErrorResponse(error, { notFoundMessage: 'Vaga não encontrada.' });
    return json({ data });
  } catch (error) { return supabaseErrorResponse(error, { notFoundMessage: 'Vaga não encontrada.' }); }
}
