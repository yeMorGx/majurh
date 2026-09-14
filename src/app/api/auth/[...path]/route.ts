import { auth } from '@/lib/auth/server';
import { errorJson, isRecord } from '@/lib/api/http';
import { getDatabase } from '@/lib/neon/db';
import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const handlers = auth.handler();

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;

type AuthHandlerContext = Parameters<typeof handlers.POST>[1];

export async function POST(request: NextRequest, context: AuthHandlerContext) {
  if (!request.nextUrl.pathname.endsWith('/sign-up/email')) {
    return handlers.POST(request, context);
  }

  const token = request.headers.get('x-majurh-invitation-token')?.trim() || '';
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
    return errorJson('O cadastro está disponível somente por convite.', 403);
  }

  let body: unknown;
  try {
    body = await request.clone().json();
  } catch {
    return errorJson('O corpo da requisição deve ser um JSON válido.', 400);
  }
  if (!isRecord(body) || typeof body.email !== 'string') {
    return errorJson('Informe um e-mail válido.', 400);
  }

  const email = body.email.trim().toLowerCase();
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const db = getDatabase();
  const invitations = await db`
    select 1
    from public.organization_invitations
    where token_hash = ${tokenHash}
      and lower(email) = ${email}
      and accepted_at is null
      and expires_at > now()
    limit 1
  `;
  if (!invitations.length) return errorJson('Este convite não é válido para este e-mail.', 403);

  return handlers.POST(request, context);
}

