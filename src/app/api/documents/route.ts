import { getAuthenticatedClient } from '@/lib/api/auth';
import {
  errorJson,
  isUuid,
  json,
  supabaseErrorResponse,
} from '@/lib/api/http';
import {
  DOCUMENT_BUCKET,
  documentSelect,
  documentStatuses,
  MAX_DOCUMENT_SIZE_BYTES,
} from '@/lib/documents/constants';
import { parseDocumentUploadPayload } from '@/lib/documents/validation';
import type { TablesInsert } from '@/types/database.types';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);

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

    const processId = request.nextUrl.searchParams.get('processId');
    if (processId && !isUuid(processId)) {
      return errorJson('Informe um processId válido.', 400);
    }

    const status = request.nextUrl.searchParams.get('status');
    if (status && !documentStatuses.includes(status as (typeof documentStatuses)[number])) {
      return errorJson('Informe um status de documento válido.', 400);
    }

    let query = supabase
      .from('candidate_documents')
      .select(documentSelect)
      .eq('organization_id', organizationId);

    if (candidateId) {
      query = query.eq('candidate_id', candidateId);
    }

    if (processId) {
      query = query.eq('process_id', processId);
    }

    if (status) {
      query = query.eq('status', status as (typeof documentStatuses)[number]);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      return supabaseErrorResponse(error);
    }

    return json({ data: data ?? [] });
  } catch (error) {
    return supabaseErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  let storagePath: string | null = null;

  try {
    const formData = await request.formData();
    const organizationId = formData.get('organizationId');
    if (!isUuid(organizationId)) {
      return errorJson('Informe um organizationId válido.', 400);
    }

    const file = formData.get('file');
    if (!(file instanceof File)) {
      return errorJson('Envie um arquivo no campo file.', 400);
    }

    if (file.size <= 0 || file.size > MAX_DOCUMENT_SIZE_BYTES) {
      return errorJson('O arquivo deve ter entre 1 byte e 6 MB.', 400);
    }

    if (!allowedMimeTypes.has(file.type)) {
      return errorJson('O arquivo deve ser PDF, JPG ou PNG.', 400);
    }

    const { supabase, userId } = await getAuthenticatedClient();
    if (!userId) {
      return errorJson('É necessário estar autenticado.', 401);
    }

    const payload = parseDocumentUploadPayload({
      candidate_id: formData.get('candidate_id'),
      process_id: formData.get('process_id'),
      document_type: formData.get('document_type'),
    });
    if (!payload.ok) {
      return json({ error: 'Dados do documento inválidos.', fields: payload.errors }, 400);
    }

    const documentId = crypto.randomUUID();
    const extension = extensionForMimeType(file.type);
    storagePath = [
      organizationId,
      payload.data.candidate_id,
      payload.data.process_id ?? 'candidate',
      `${documentId}.${extension}`,
    ].join('/');

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return errorJson('Não foi possível enviar o documento.', 502);
    }

    const documentInsert = {
      id: documentId,
      organization_id: organizationId,
      candidate_id: payload.data.candidate_id,
      process_id: payload.data.process_id ?? null,
      document_type: payload.data.document_type,
      status: 'uploaded',
      storage_path: storagePath,
      original_name: file.name.slice(0, 255),
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: userId,
    } as TablesInsert<'candidate_documents'>;

    const { data, error } = await supabase
      .from('candidate_documents')
      .insert(documentInsert)
      .select(documentSelect)
      .single();

    if (error) {
      await removeUploadedFile(supabase, storagePath);
      return supabaseErrorResponse(error, {
        foreignKeyMessage: 'Candidato ou processo não encontrado, ou o processo não pertence ao candidato.',
        constraintMessage: 'O processo informado precisa pertencer ao mesmo candidato e organização.',
      });
    }

    return json({ data }, 201);
  } catch (error) {
    if (storagePath) {
      try {
        const { supabase } = await getAuthenticatedClient();
        await removeUploadedFile(supabase, storagePath);
      } catch {
        // A limpeza é uma tentativa de compensação; o erro original é mais útil para a API.
      }
    }

    return supabaseErrorResponse(error);
  }
}

async function removeUploadedFile(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>['supabase'],
  path: string,
) {
  await supabase.storage.from(DOCUMENT_BUCKET).remove([path]);
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }

  return mimeType === 'image/png' ? 'png' : 'jpg';
}
