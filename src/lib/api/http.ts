import { NextResponse } from 'next/server';

export function json<T>(body: T, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export function errorJson(message: string, status: number) {
  return json({ error: message }, status);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export function databaseErrorResponse(
  error: unknown,
  options: {
    duplicateMessage?: string;
    notFoundMessage?: string;
    foreignKeyMessage?: string;
    constraintMessage?: string;
  } = {},
) {
  const code = getErrorCode(error);

  if (code === '23505') {
    if (getErrorMessage(error)?.includes('Este e-mail já está vinculado a uma organização')) {
      return errorJson(
        'Este e-mail já está vinculado a uma organização. Uma pessoa só pode pertencer a uma organização.',
        409,
      );
    }
    return errorJson(
      options.duplicateMessage ??
        'Já existe um candidato com este CPF nesta organização.',
      409,
    );
  }

  if (code === 'PGRST116') {
    return errorJson(options.notFoundMessage ?? 'Candidato não encontrado.', 404);
  }

  if (code === '23503') {
    return errorJson(
      options.foreignKeyMessage ?? 'Uma referência informada não foi encontrada.',
      400,
    );
  }

  if (code === '23514') {
    return errorJson(
      options.constraintMessage ?? 'Os dados informados violam uma regra do sistema.',
      400,
    );
  }

  if (code === '42703' || code === '42P01' || code === '42883') {
    return errorJson(
      'O banco ainda não está alinhado com esta versão do Majurh. Execute as migrações do Neon e tente novamente.',
      503,
    );
  }

  if (isConfigurationError(error)) {
    return errorJson('O banco de dados não está configurado neste ambiente.', 503);
  }

  return errorJson('Não foi possível concluir a operação.', 500);
}

export function isUndefinedColumnError(error: unknown) {
  return getErrorCode(error) === '42703';
}

function getErrorCode(error: unknown) {
  if (!isRecord(error)) {
    return undefined;
  }

  return typeof error.code === 'string' ? error.code : undefined;
}

function getErrorMessage(error: unknown) {
  if (!isRecord(error)) return undefined;
  return typeof error.message === 'string' ? error.message : undefined;
}

function isConfigurationError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.startsWith('Variável de ambiente obrigatória ausente:')
  );
}
