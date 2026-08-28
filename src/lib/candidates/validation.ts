import { candidateFields, type CandidateField } from '@/lib/candidates/constants';
import { isRecord } from '@/lib/api/http';

type ValidationMode = 'create' | 'update';

export type CandidatePayload = {
  full_name?: string;
  cpf?: string;
  cpf_normalized?: string;
  rg?: string | null;
  birth_date?: string | null;
  phone?: string | null;
  email?: string | null;
  postal_code?: string | null;
  street?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  cnh_number?: string | null;
  cnh_category?: string | null;
  cnh_expires_at?: string | null;
  notes?: string | null;
};

export type ValidationResult =
  | { ok: true; data: CandidatePayload }
  | { ok: false; errors: string[] };

const maxLengths: Partial<Record<CandidateField, number>> = {
  full_name: 160,
  rg: 32,
  phone: 32,
  email: 254,
  postal_code: 16,
  street: 160,
  address_number: 32,
  address_complement: 120,
  neighborhood: 120,
  city: 120,
  cnh_number: 32,
  cnh_category: 8,
  notes: 2000,
};

const dateFields = new Set<CandidateField>(['birth_date', 'cnh_expires_at']);

export function parseCandidatePayload(
  input: unknown,
  mode: ValidationMode,
): ValidationResult {
  if (!isRecord(input)) {
    return { ok: false, errors: ['O corpo da requisição deve ser um objeto JSON.'] };
  }

  const errors: string[] = [];
  const payload: CandidatePayload = {};
  const allowedFields = new Set<string>(candidateFields);

  for (const key of Object.keys(input)) {
    if (!allowedFields.has(key)) {
      errors.push(`Campo não permitido: ${key}.`);
    }
  }

  for (const field of candidateFields) {
    const hasField = Object.prototype.hasOwnProperty.call(input, field);

    if (field === 'full_name') {
      if (mode === 'create' && !hasField) {
        errors.push('O nome completo é obrigatório.');
      } else if (hasField) {
        const value = readText(input[field], field, maxLengths[field] ?? 160, errors);
        if (value !== null) {
          if (value.length < 2) {
            errors.push('O nome completo deve ter pelo menos 2 caracteres.');
          } else {
            payload[field] = value;
          }
        }
      }
      continue;
    }

    if (field === 'cpf') {
      if (mode === 'create' && !hasField) {
        errors.push('O CPF é obrigatório.');
      } else if (hasField) {
        const value = readText(input[field], field, 18, errors);
        if (value !== null) {
          const normalized = normalizeCpf(value);
          if (!normalized || !isValidCpf(normalized)) {
            errors.push('Informe um CPF válido.');
          } else {
            payload.cpf = value;
            payload.cpf_normalized = normalized;
          }
        }
      }
      continue;
    }

    if (!hasField && mode === 'update') {
      continue;
    }

    if (dateFields.has(field)) {
      const value = readOptionalText(input[field], field, 10, errors);
      if (value !== undefined) {
        if (value !== null && !isIsoDate(value)) {
          errors.push(`${field} deve estar no formato AAAA-MM-DD.`);
        } else {
          payload[field] = value;
        }
      }
      continue;
    }

    const value = readOptionalText(
      input[field],
      field,
      maxLengths[field] ?? 120,
      errors,
    );

    if (value !== undefined) {
      payload[field] = field === 'state' && value ? value.toUpperCase() : value;
    }
  }

  if (payload.email && !/^\S+@\S+\.\S+$/.test(payload.email)) {
    errors.push('Informe um e-mail válido.');
  }

  if (payload.state && !/^[A-Z]{2}$/.test(payload.state)) {
    errors.push('O estado deve ter 2 letras.');
  }

  if (errors.length > 0) {
    return { ok: false, errors: [...new Set(errors)] };
  }

  return { ok: true, data: payload };
}

function readText(
  value: unknown,
  field: string,
  maxLength: number,
  errors: string[],
) {
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

function readOptionalText(
  value: unknown,
  field: string,
  maxLength: number,
  errors: string[],
) {
  if (value === null || value === '') {
    return null;
  }

  if (value === undefined) {
    return undefined;
  }

  return readText(value, field, maxLength, errors);
}

function normalizeCpf(value: string) {
  const normalized = value.replace(/\D/g, '');
  return normalized.length === 11 ? normalized : null;
}

function isValidCpf(value: string) {
  if (/^(\d)\1{10}$/.test(value)) {
    return false;
  }

  let firstSum = 0;
  for (let index = 0; index < 9; index += 1) {
    firstSum += Number(value[index]) * (10 - index);
  }
  const firstDigit = (firstSum * 10) % 11 === 10 ? 0 : (firstSum * 10) % 11;

  let secondSum = 0;
  for (let index = 0; index < 10; index += 1) {
    secondSum += Number(value[index]) * (11 - index);
  }
  const secondDigit =
    (secondSum * 10) % 11 === 10 ? 0 : (secondSum * 10) % 11;

  return firstDigit === Number(value[9]) && secondDigit === Number(value[10]);
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
