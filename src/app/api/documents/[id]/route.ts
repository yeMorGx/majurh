import { getAuthenticatedClient } from '@/lib/api/auth';
import {
  errorJson,
  isRecord,
  isUuid,
  json,
  supabaseErrorResponse,
} from '@/lib/api/http';
import {
  DOCUMENT_BUCKET,
  documentSelect,
  documentStatuses,
  SIGNED_URL_TTL_SECONDS,
  type DocumentStatus,
} from '@/lib/documents/constants';
import { parseDocumentReviewPayload } from '@/lib/documents/validation';
import type { TablesUpdate } from '@/types/database.types';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

type DocumentRouteContext = {
  params: Promise<{ id: string }>;
};

type DocumentRecord = {
  id: string;
  organization_id: string;
  storage_path: string | null;
  status: DocumentStatus;
};

export async function GET(request: NextRequest, context: DocumentRouteContext) {
  return withDocumentContext(request, context, async ({ supabase, organizationId, id }) => {
    const { data: documentData, error } = await supabase
      .from('candidate_documents')
      .select(documentSelect)
      .eq('organization_id', organizationId)
      .eq('id', id)
      .single();

    if (error) {
      return supabaseErrorResponse(error, {
        notFoundMessage: 'Documento não encontrado.',
      });
    }

    const document = documentData as unknown as DocumentRecord;
    let signedUrl: string | null = null;

    if (document.storage_path) {
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .createSignedUrl(document.storage_path, SIGNED_URL_TTL_SECONDS);

      if (signedUrlError) {
        return errorJson('Não foi possível gerar o acesso temporário ao documento.', 502);
      }

      signedUrl = signedUrlData.signedUrl;
    }

    return json({ data: documentData, signedUrl });
  });
}

export async function PATCH(request: NextRequest, context: DocumentRouteContext) {
  return withDocumentContext(request, context, async ({ supabase, organizationId, id, userId }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorJson('O corpo da requisição deve ser um JSON válido.', 400);
    }

    if (!isRecord(body)) {
      return errorJson('O corpo da requisição deve ser um objeto JSON.', 400);
    }

    const parsed = parseDocumentReviewPayload(body);
    if (!parsed.ok) {
      return json({ error: 'Dados da revisão inválidos.', fields: parsed.errors }, 400);
    }

    const update = { ...parsed.data } as TablesUpdate<'candidate_documents'>;
    if (parsed.data.status) {
      if (isReviewCompleted(parsed.data.status)) {
        update.reviewed_by = userId;
        update.reviewed_at = new Date().toISOString();
      } else {
        update.reviewed_by = null;
        update.reviewed_at = null;
      }
    }

    const { data, error } = await supabase
      .from('candidate_documents')
      .update(update)
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select(documentSelect)
      .single();

    if (error) {
      return supabaseErrorResponse(error, {
        notFoundMessage: 'Documento não encontrado.',
      });
    }

    return json({ data });
  });
}

async function withDocumentContext(
  request: NextRequest,
  context: DocumentRouteContext,
  handler: (context: {
    supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>['supabase'];
    organizationId: string;
    id: string;
    userId: string;
  }) => Promise<Response>,
) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    const { id } = await context.params;

    if (!isUuid(organizationId)) {
      return errorJson('Informe um organizationId válido.', 400);
    }

    if (!isUuid(id)) {
      return errorJson('Informe um id de documento válido.', 400);
    }

    const { supabase, userId } = await getAuthenticatedClient();
    if (!userId) {
      return errorJson('É necessário estar autenticado.', 401);
    }

    return handler({ supabase, organizationId, id, userId });
  } catch (error) {
    return supabaseErrorResponse(error, {
      notFoundMessage: 'Documento não encontrado.',
    });
  }
}

function isReviewCompleted(status: DocumentStatus) {
  return ['approved', 'rejected', 'request_again'].includes(status);
}
