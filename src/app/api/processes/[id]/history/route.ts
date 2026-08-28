import { getAuthenticatedClient } from '@/lib/api/auth';
import {
  errorJson,
  isUuid,
  json,
  supabaseErrorResponse,
} from '@/lib/api/http';
import { processHistorySelect } from '@/lib/processes/constants';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

type HistoryRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: HistoryRouteContext) {
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

    const { data, error } = await supabase
      .from('process_history')
      .select(processHistorySelect)
      .eq('organization_id', organizationId)
      .eq('process_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return supabaseErrorResponse(error);
    }

    return json({ data: data ?? [] });
  } catch (error) {
    return supabaseErrorResponse(error);
  }
}
