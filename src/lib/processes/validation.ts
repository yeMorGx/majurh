import { isRecord } from '@/lib/api/http';
import {
  candidateSources,
  processStatuses,
  reapplicationDecisions,
  withdrawalReasonCodes,
  type CandidateSource,
  type ProcessStatus,
  type ReapplicationDecision,
  type WithdrawalReasonCode,
} from '@/lib/processes/constants';

type ValidationMode = 'create' | 'update';

export type ProcessPayload = {
  candidate_id?: string;
  vacancy_id?: string | null;
  responsible_user_id?: string | null;
  source?: CandidateSource | null;
  status?: ProcessStatus;
  started_at?: string;
  finished_at?: string | null;
  withdrawal_reason_code?: WithdrawalReasonCode | null;
  withdrawal_notes?: string | null;
  can_apply_again?: ReapplicationDecision | null;
};

export type ValidationResult =
  | { ok: true; data: ProcessPayload }
  | { ok: false; errors: string[] };

const createFields = [
  'candidate_id',
  'vacancy_id',
  'responsible_user_id',
  'source',
  'status',
  'started_at',
  'finished_at',
  'withdrawal_reason_code',
  'withdrawal_notes',
  'can_apply_again',
] as const;

const updateFields = createFields.filter((field) => field !== 'candidate_id');

const maxLengths = {
  withdrawal_notes: 2000,
} as const;

export function parseProcessPayload(
  input: unknown,
  mode: ValidationMode,
): ValidationResult {
  if (!isRecord(input)) {
    return { ok: false, errors: ['O corpo da requisição deve ser um objeto JSON.'] };
  }

  const errors: string[] = [];
  const payload: ProcessPayload = {};
  const allowedFields = new Set<string>(mode === 'create' ? createFields : updateFields);

  for (const key of Object.keys(input)) {
    if (!allowedFields.has(key)) {
      errors.push(
        key === 'candidate_id' && mode === 'update'
          ? 'O candidato de um processo não pode ser alterado.'
          : `Campo não permitido: ${key}.`,
      );
    }
  }

  if (mode === 'create' && !Object.prototype.hasOwnProperty.call(input, 'candidate_id')) {
    errors.push('O candidato é obrigatório.');
  }

  if (hasField(input, 'candidate_id') && allowedFields.has('candidate_id')) {
    const value = readUuid(input.candidate_id, 'candidate_id', errors);
    if (value) {
      payload.candidate_id = value;
    }
  }

  if (hasField(input, 'vacancy_id')) {
    payload.vacancy_id = readNullableUuid(input.vacancy_id, 'vacancy_id', errors);
  }

  if (hasField(input, 'responsible_user_id')) {
    payload.responsible_user_id = readNullableUuid(
      input.responsible_user_id,
      'responsible_user_id',
      errors,
    );
  }

  if (hasField(input, 'source')) {
    payload.source = readNullableEnum(
      input.source,
      'source',
      candidateSources,
      errors,
    );
  }

  if (hasField(input, 'status')) {
    const value = readEnum(input.status, 'status', processStatuses, errors);
    if (value) {
      payload.status = value;
    }
  }

  if (hasField(input, 'started_at')) {
    payload.started_at = readDateTime(input.started_at, 'started_at', errors);
  }

  if (hasField(input, 'finished_at')) {
    payload.finished_at = readNullableDateTime(input.finished_at, 'finished_at', errors);
  }

  if (hasField(input, 'withdrawal_reason_code')) {
    payload.withdrawal_reason_code = readNullableEnum(
      input.withdrawal_reason_code,
      'withdrawal_reason_code',
      withdrawalReasonCodes,
      errors,
    );
  }

  if (hasField(input, 'withdrawal_notes')) {
    payload.withdrawal_notes = readNullableText(
      input.withdrawal_notes,
      'withdrawal_notes',
      maxLengths.withdrawal_notes,
      errors,
    );
  }

  if (hasField(input, 'can_apply_again')) {
    payload.can_apply_again = readNullableEnum(
      input.can_apply_again,
      'can_apply_again',
      reapplicationDecisions,
      errors,
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors: [...new Set(errors)] };
  }

  return { ok: true, data: payload };
}

export function validateWithdrawalState(
  status: ProcessStatus | undefined,
  withdrawalReasonCode: WithdrawalReasonCode | null | undefined,
) {
  if (status === 'withdrawn' && !withdrawalReasonCode) {
    return 'Informe o motivo da desistência quando o status for withdrawn.';
  }

  return null;
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

function readNullableEnum<T extends readonly string[]>(
  value: unknown,
  field: string,
  allowedValues: T,
  errors: string[],
): T[number] | null | undefined {
  if (value === null || value === '') {
    return null;
  }

  return readEnum(value, field, allowedValues, errors);
}

function readDateTime(value: unknown, field: string, errors: string[]) {
  if (typeof value !== 'string' || !isIsoDateTime(value)) {
    errors.push(`${field} deve ser uma data/hora ISO 8601 válida.`);
    return '';
  }

  return value;
}

function readNullableDateTime(value: unknown, field: string, errors: string[]) {
  if (value === null || value === '') {
    return null;
  }

  return readDateTime(value, field, errors);
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

function isIsoDateTime(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(
    value,
  ) && !Number.isNaN(Date.parse(value));
}
