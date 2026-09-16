import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import { databaseErrorResponse, errorJson, isRecord, isUuid, json } from '@/lib/api/http';
import { candidateSelect } from '@/lib/candidates/constants';
import { parseCandidatePayload } from '@/lib/candidates/validation';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    if (!isUuid(organizationId)) return errorJson('Informe um organizationId válido.', 400);

    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    if (!await getOrganizationRole(db, userId, organizationId)) return errorJson('Você não tem acesso a esta organização.', 403);

    const page = parsePositiveInteger(request.nextUrl.searchParams.get('page'), 1);
    const pageSize = Math.min(parsePositiveInteger(request.nextUrl.searchParams.get('pageSize'), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const search = request.nextUrl.searchParams.get('q')?.trim() ?? '';
    const from = (page - 1) * pageSize;
    const pattern = `%${escapeSearchValue(search)}%`;
    const filters = search
      ? `and (full_name ilike $2 or cpf ilike $2 or cpf_normalized ilike $2 or rg ilike $2 or phone ilike $2 or email ilike $2)`
      : '';
    const params = search ? [organizationId, pattern, pageSize, from] : [organizationId, pageSize, from];
    const rows = await db.query(
      `select ${candidateSelect} from public.candidates where organization_id = $1 ${filters} order by full_name asc limit $${search ? 3 : 2} offset $${search ? 4 : 3}`,
      params,
    );
    const countRows = await db.query(
      `select count(*)::int as count from public.candidates where organization_id = $1 ${filters}`,
      search ? [organizationId, pattern] : [organizationId],
    ) as Array<{ count: number }>;
    const total = Number(countRows[0]?.count ?? 0);

    return json({
      data: rows,
      pagination: { page, pageSize, total, totalPages: total ? Math.ceil(total / pageSize) : 0 },
    });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    if (!isRecord(body) || !isUuid(body.organizationId)) return errorJson('Informe um organizationId válido.', 400);

    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    const role = await getOrganizationRole(db, userId, body.organizationId);
    if (!role || !['admin', 'recruiter'].includes(role)) return errorJson('Você não tem permissão para cadastrar candidatos.', 403);

    const parsed = parseCandidatePayload(Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'organizationId')), 'create');
    if (!parsed.ok) return json({ error: 'Dados do candidato inválidos.', fields: parsed.errors }, 400);

    const value = parsed.data;
    const rows = await db`
      insert into public.candidates (
        organization_id, full_name, cpf, cpf_normalized, rg, identity_document_type, birth_date, phone, email,
        postal_code, street, address_number, address_complement, neighborhood, city, state,
        cnh_number, cnh_category, cnh_expires_at, notes, created_by
      ) values (
        ${body.organizationId}, ${value.full_name}, ${value.cpf}, ${value.cpf_normalized},
        ${value.rg ?? null}, ${value.identity_document_type ?? 'rg'}, ${value.birth_date ?? null}, ${value.phone ?? null}, ${value.email ?? null},
        ${value.postal_code ?? null}, ${value.street ?? null}, ${value.address_number ?? null},
        ${value.address_complement ?? null}, ${value.neighborhood ?? null}, ${value.city ?? null},
        ${value.state ?? null}, ${value.cnh_number ?? null}, ${value.cnh_category ?? null},
        ${value.cnh_expires_at ?? null}, ${value.notes ?? null}, ${userId}
      ) returning ${db.unsafe(candidateSelect)}
    `;

    return json({ data: rows[0] }, 201);
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

async function readJson(request: NextRequest) {
  try { return await request.json() as unknown; } catch { return null; }
}

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function escapeSearchValue(value: string) {
  return value.replace(/[\\%_]/g, '\\$&').replace(/[(),]/g, ' ');
}
