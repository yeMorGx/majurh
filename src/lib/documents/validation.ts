import { isRecord } from '@/lib/api/http';
import {
  documentStatuses,
  documentTypes,
  type DocumentStatus,
  type DocumentType,
} from '@/lib/documents/constants';

export type DocumentUploadPayload = {
  candidate_id?: string;
  process_id?: string | null;
  document_type?: DocumentType;
};

export type DocumentReviewPayload = {
  status?: DocumentStatus;
  notes?: string | null;
};

type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: string[] };

export function parseDocumentUploadPayload(
  input: unknown,
): ValidationResult<DocumentUploadPayload> {
  if (!isRecord(input)) {
    return { ok: false, errors: ['Os metadados devem ser um objeto JSON.'] };
  }

  const errors: string[] = [];
  const payload: DocumentUploadPayload = {};
  const allowedFields = new Set(['candidate_id', 'process_id', 'document_type']);

  for (const key of Object.keys(input)) {
    if (!allowedFields.has(key)) {
      errors.push(`Campo não permitido: ${key}.`);
    }
  }

  if (!hasField(input, 'candidate_id')) {
    errors.push('O candidato é obrigatório.');
  } else {
    const candidateId = readUuid(input.candidate_id, 'candidate_id', errors);
    if (candidateId) {
      payload.candidate_id = candidateId;
    }
  }

  if (hasField(input, 'process_id')) {
    payload.process_id = readNullableUuid(input.process_id, 'process_id', errors);
  }

  if (!hasField(input, 'document_type')) {
    errors.push('O tipo de documento é obrigatório.');
  } else {
    const documentType = readEnum(
      input.document_type,
      'document_type',
      documentTypes,
      errors,
    );
    if (documentType) {
      payload.document_type = documentType;
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors: [...new Set(errors)] };
  }

  return { ok: true, data: payload };
}

export function parseDocumentReviewPayload(
  input: unknown,
): ValidationResult<DocumentReviewPayload> {
  if (!isRecord(input)) {
    return { ok: false, errors: ['O corpo da requisição deve ser um objeto JSON.'] };
  }

  const errors: string[] = [];
  const payload: DocumentReviewPayload = {};
  const allowedFields = new Set(['status', 'notes']);

  for (const key of Object.keys(input)) {
    if (!allowedFields.has(key)) {
      errors.push(`Campo não permitido: ${key}.`);
    }
  }

  if (hasField(input, 'status')) {
    const status = readEnum(input.status, 'status', documentStatuses, errors);
    if (status) {
      payload.status = status;
    }
  }

  if (hasField(input, 'notes')) {
    payload.notes = readNullableText(input.notes, 'notes', 2000, errors);
  }

  if (Object.keys(payload).length === 0 && errors.length === 0) {
    errors.push('Informe ao menos status ou notes para atualizar.');
  }

  if (errors.length > 0) {
    return { ok: false, errors: [...new Set(errors)] };
  }

  return { ok: true, data: payload };
}

function hasField(input: Record<string, unknown>, field: string) {
  return Object.prototype.hasOwnProperty.call(input, field);
}

function readUuid(value: unknown, field: string, errors: string[]) {
  if (typeof value !== 'string' || !isUuidValue(value)) {
    errors.push(`${field} deve ser um UUID válido.`);
    return null;
  }

  return value;
}

function readNullableUuid(value: unknown, field: string, errors: string[]) {
  if (value === null || value === '') {
    return null;
  }

  return readUuid(value, field, errors);
}

function readEnum<T extends readonly string[]>(
  value: unknown,
  field: string,
  allowedValues: T,
  errors: string[],
): T[number] | undefined {
  if (typeof value !== 'string' || !allowedValues.includes(value)) {
    errors.push(`${field} contém um valor inválido.`);
    return undefined;
  }

  return value;
}

function readNullableText(
  value: unknown,
  field: string,
  maxLength: number,
  errors: string[],
) {
  if (value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    errors.push(`${field} deve ser um texto.`);
    return null;
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    errors.push(`${field} deve ter no máximo ${maxLength} caracteres.`);
    return null;
  }

  return normalized;
}

function isUuidValue(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
