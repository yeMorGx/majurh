import { getAuthenticatedClient } from '@/lib/api/auth';
import { databaseErrorResponse, errorJson, isRecord, json } from '@/lib/api/http';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const emptyState = { board: [], tasks: [], events: [], ideas: [] };
const collectionKeys = ['board', 'tasks', 'events', 'ideas'] as const;
const MAX_ITEMS_PER_COLLECTION = 200;
const MAX_STATE_BYTES = 350_000;

export async function GET() {
  try {
    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);

    const membership = await getFirstMembership(db, userId);
    if (!membership) return errorJson('Seu usuário ainda não está associado a uma organização.', 403);

    const rows = await db`
      select board, tasks, events, ideas, updated_at
      from public.productivity_workspaces
      where organization_id = ${membership.organization_id}::uuid
      limit 1
    ` as Array<{ board: unknown; tasks: unknown; events: unknown; ideas: unknown; updated_at: string }>;

    const row = rows[0];
    return json({
      data: {
        organizationId: membership.organization_id,
        state: row ? normalizeStoredState(row) : emptyState,
        updatedAt: row?.updated_at ?? null,
      },
    });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);

    const membership = await getFirstMembership(db, userId);
    if (!membership) return errorJson('Seu usuário ainda não está associado a uma organização.', 403);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorJson('O corpo da requisição deve ser um JSON válido.', 400);
    }

    if (!isRecord(body)) return errorJson('Informe o estado da produtividade.', 400);
    const state = readState(body.state ?? body);
    if (!state) return errorJson('O estado da produtividade é inválido ou excede o limite permitido.', 400);

    const rows = await db`
      insert into public.productivity_workspaces (organization_id, board, tasks, events, ideas, updated_by)
      values (
        ${membership.organization_id}::uuid,
        ${JSON.stringify(state.board)}::jsonb,
        ${JSON.stringify(state.tasks)}::jsonb,
        ${JSON.stringify(state.events)}::jsonb,
        ${JSON.stringify(state.ideas)}::jsonb,
        ${userId}
      )
      on conflict (organization_id) do update set
        board = excluded.board,
        tasks = excluded.tasks,
        events = excluded.events,
        ideas = excluded.ideas,
        updated_by = excluded.updated_by
      returning board, tasks, events, ideas, updated_at
    ` as Array<{ board: unknown; tasks: unknown; events: unknown; ideas: unknown; updated_at: string }>;

    const saved = rows[0];
    return json({
      data: {
        organizationId: membership.organization_id,
        state: saved ? normalizeStoredState(saved) : state,
        updatedAt: saved?.updated_at ?? null,
      },
    });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

async function getFirstMembership(db: Awaited<ReturnType<typeof getAuthenticatedClient>>['db'], userId: string) {
  const rows = await db`
    select organization_id
    from public.organization_members
    where user_id = ${userId}
    order by created_at asc
    limit 1
  ` as Array<{ organization_id: string }>;
  return rows[0] ?? null;
}

function readState(value: unknown) {
  if (!isRecord(value)) return null;

  const state = Object.fromEntries(collectionKeys.map((key) => [key, readCollection(value[key])])) as Record<string, unknown>;
  if (collectionKeys.some((key) => !Array.isArray(state[key]))) return null;
  if (new TextEncoder().encode(JSON.stringify(state)).byteLength > MAX_STATE_BYTES) return null;
  return state as { board: unknown[]; tasks: unknown[]; events: unknown[]; ideas: unknown[] };
}

function readCollection(value: unknown) {
  if (!Array.isArray(value) || value.length > MAX_ITEMS_PER_COLLECTION) return null;
  return value.filter((item) => isRecord(item));
}

function normalizeStoredState(value: { board: unknown; tasks: unknown; events: unknown; ideas: unknown }) {
  return {
    board: Array.isArray(value.board) ? value.board : [],
    tasks: Array.isArray(value.tasks) ? value.tasks : [],
    events: Array.isArray(value.events) ? value.events : [],
    ideas: Array.isArray(value.ideas) ? value.ideas : [],
  };
}
