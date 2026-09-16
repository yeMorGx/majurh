import { del, put } from '@vercel/blob';
import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import { databaseErrorResponse, errorJson, isUuid, json } from '@/lib/api/http';
import { documentSelect, documentStatuses, MAX_DOCUMENT_SIZE_BYTES } from '@/lib/documents/constants';
import { parseDocumentUploadPayload } from '@/lib/documents/validation';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    if (!isUuid(organizationId)) return errorJson('Informe um organizationId válido.', 400);
    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    if (!await getOrganizationRole(db, userId, organizationId)) return errorJson('Você não tem acesso a esta organização.', 403);
    const candidateId = request.nextUrl.searchParams.get('candidateId');
    const processId = request.nextUrl.searchParams.get('processId');
    const status = request.nextUrl.searchParams.get('status');
    if (candidateId && !isUuid(candidateId)) return errorJson('Informe um candidateId válido.', 400);
    if (processId && !isUuid(processId)) return errorJson('Informe um processId válido.', 400);
    if (status && !documentStatuses.includes(status as (typeof documentStatuses)[number])) return errorJson('Informe um status de documento válido.', 400);
    const conditions = ['organization_id = $1'];
    const params: unknown[] = [organizationId];
    if (candidateId) { params.push(candidateId); conditions.push(`candidate_id = $${params.length}`); }
    if (processId) { params.push(processId); conditions.push(`process_id = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
    const rows = await db.query(`select ${documentSelect} from public.candidate_documents where ${conditions.join(' and ')} order by created_at desc`, params);
    return json({ data: rows });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
export async function POST(request: NextRequest) {
  let storagePath: string | null = null;
  try {
    const formData = await request.formData();
    const organizationId = formData.get('organizationId');
    if (!isUuid(organizationId)) return errorJson('Informe um organizationId válido.', 400);
    const file = formData.get('file');
    if (!(file instanceof File)) return errorJson('Envie um arquivo no campo file.', 400);
    if (file.size <= 0 || file.size > MAX_DOCUMENT_SIZE_BYTES) return errorJson('O arquivo deve ter entre 1 byte e 6 MB.', 400);
    const mimeType = file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : file.type;
    if (!allowedMimeTypes.has(mimeType)) return errorJson('O arquivo deve ser PDF, JPG ou PNG.', 400);
    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    const role = await getOrganizationRole(db, userId, organizationId);
    if (!role || !['admin', 'recruiter'].includes(role)) return errorJson('Você não tem permissão para enviar documentos.', 403);
    const payload = parseDocumentUploadPayload({ candidate_id: formData.get('candidate_id'), process_id: formData.get('process_id'), document_type: formData.get('document_type') });
    if (!payload.ok) return json({ error: 'Dados do documento inválidos.', fields: payload.errors }, 400);
    const documentId = crypto.randomUUID();
    storagePath = [organizationId, payload.data.candidate_id, payload.data.process_id ?? 'candidate', `${documentId}.${extensionForMimeType(mimeType)}`].join('/');
    await put(storagePath, file, { access: 'private', contentType: mimeType, addRandomSuffix: false });
    const rows = await db`
      insert into public.candidate_documents (
        id, organization_id, candidate_id, process_id, document_type, status, storage_path,
        original_name, mime_type, size_bytes, uploaded_by
      ) values (
        ${documentId}, ${organizationId}, ${payload.data.candidate_id}, ${payload.data.process_id ?? null},
        ${payload.data.document_type}, 'uploaded', ${storagePath}, ${file.name.slice(0, 255)},
        ${mimeType}, ${file.size}, ${userId}
      ) returning ${db.unsafe(documentSelect)}
    `;
    return json({ data: rows[0] }, 201);
  } catch (error) {
    if (storagePath) {
      try { await del(storagePath); } catch { /* compensação best-effort */ }
    }
    return databaseErrorResponse(error, { foreignKeyMessage: 'Candidato ou processo não encontrado, ou o processo não pertence ao candidato.', constraintMessage: 'O processo informado precisa pertencer ao mesmo candidato e organização.' });
  }
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === 'application/pdf') return 'pdf';
  return mimeType === 'image/png' ? 'png' : 'jpg';
}
