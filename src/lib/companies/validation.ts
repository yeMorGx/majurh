import { isRecord } from '@/lib/api/http';

type ValidationMode = 'create' | 'update';

export type CompanyPayload = {
  name?: string;
  legal_name?: string | null;
  cnpj?: string | null;
  is_active?: boolean;
};

export function parseCompanyPayload(input: unknown, mode: ValidationMode) {
  if (!isRecord(input)) return { ok: false as const, errors: ['O corpo deve ser um objeto JSON.'] };
  const errors: string[] = [];
  const payload: CompanyPayload = {};
  const allowed = new Set(['name', 'legal_name', 'cnpj', 'is_active']);

  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) errors.push(`Campo não permitido: ${key}.`);
  }

  if (mode === 'create' && !has(input, 'name')) errors.push('O nome da empresa é obrigatório.');
  if (has(input, 'name')) {
    const value = readText(input.name, 'name', 160, errors);
    if (value !== null) {
      if (value.length < 2) errors.push('O nome da empresa deve ter pelo menos 2 caracteres.');
      else payload.name = value;
    }
  }
  if (has(input, 'legal_name')) payload.legal_name = nullableText(input.legal_name, 'legal_name', 180, errors);
  if (has(input, 'cnpj')) {
    const value = nullableText(input.cnpj, 'cnpj', 18, errors);
    if (value && value.replace(/\D/g, '').length !== 14) errors.push('O CNPJ deve ter 14 números.');
    payload.cnpj = value;
  }
  if (has(input, 'is_active')) {
    if (typeof input.is_active !== 'boolean') errors.push('is_active deve ser booleano.');
    else payload.is_active = input.is_active;
  }

  if (errors.length) return { ok: false as const, errors: [...new Set(errors)] };
  return { ok: true as const, data: payload };
}

function has(input: Record<string, unknown>, field: string) {
  return Object.prototype.hasOwnProperty.call(input, field);
}

function readText(value: unknown, field: string, max: number, errors: string[]) {
  if (typeof value !== 'string') {
    errors.push(`${field} deve ser um texto.`);
    return null;
  }
  const normalized = value.trim();
  if (normalized.length > max) errors.push(`${field} deve ter no máximo ${max} caracteres.`);
  return normalized;
}

function nullableText(value: unknown, field: string, max: number, errors: string[]) {
  if (value === null || value === '') return null;
  return readText(value, field, max, errors);
}
