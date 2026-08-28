import { isRecord } from '@/lib/api/http';

type ValidationMode = 'create' | 'update';

export type VacancyPayload = {
  title?: string;
  department?: string | null;
  unit?: string | null;
  is_active?: boolean;
};

export function parseVacancyPayload(input: unknown, mode: ValidationMode) {
  if (!isRecord(input)) return { ok: false as const, errors: ['O corpo deve ser um objeto JSON.'] };
  const errors: string[] = [];
  const payload: VacancyPayload = {};
  const allowed = new Set(['title', 'department', 'unit', 'is_active']);
  Object.keys(input).forEach((key) => { if (!allowed.has(key)) errors.push(`Campo não permitido: ${key}.`); });
  if (mode === 'create' && !has(input, 'title')) errors.push('O título da vaga é obrigatório.');
  if (has(input, 'title')) { const value = text(input.title, 'title', 120, errors); if (value !== null) { if (value.length < 2) errors.push('O título da vaga deve ter pelo menos 2 caracteres.'); else payload.title = value; } }
  if (has(input, 'department')) payload.department = nullableText(input.department, 'department', 120, errors);
  if (has(input, 'unit')) payload.unit = nullableText(input.unit, 'unit', 120, errors);
  if (has(input, 'is_active')) { if (typeof input.is_active !== 'boolean') errors.push('is_active deve ser booleano.'); else payload.is_active = input.is_active; }
  if (errors.length) return { ok: false as const, errors: [...new Set(errors)] };
  return { ok: true as const, data: payload };
}

function has(input: Record<string, unknown>, field: string) { return Object.prototype.hasOwnProperty.call(input, field); }
function text(value: unknown, field: string, max: number, errors: string[]) { if (typeof value !== 'string') { errors.push(`${field} deve ser um texto.`); return null; } const normalized = value.trim(); if (normalized.length > max) errors.push(`${field} deve ter no máximo ${max} caracteres.`); return normalized; }
function nullableText(value: unknown, field: string, max: number, errors: string[]) { if (value === null || value === '') return null; return text(value, field, max, errors); }
