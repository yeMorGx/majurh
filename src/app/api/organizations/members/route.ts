import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import {
  databaseErrorResponse,
  errorJson,
  isRecord,
  isUndefinedColumnError,
  isUuid,
  json,
} from '@/lib/api/http';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const presenceStatuses = ['online', 'offline', 'away', 'busy'] as const;
type PresenceStatus = (typeof presenceStatuses)[number];

type MemberRow = {
  user_id: string;
  email: string | null;
  role: 'admin' | 'recruiter' | 'viewer';
  created_at: string;
  full_name: string;
  presence_status: PresenceStatus;
  presence_updated_at: string | null;
  is_current_user: boolean;
};

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId')?.trim() ?? '';
    if (!isUuid(organizationId)) return errorJson('Organização inválida.', 400);

    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    const role = await getOrganizationRole(db, userId, organizationId);
    if (!role) return errorJson('Você não tem acesso a esta organização.', 403);

    let members: MemberRow[];
    try {
      members = (await db`
        select om.user_id, om.email, om.role, om.created_at,
          coalesce(nullif(p.full_name, ''), nullif(lau.full_name, ''), nullif(split_part(om.email, '@', 1), ''), 'Membro da equipe') as full_name,
          case
            when om.presence_status = 'online'
              and om.presence_updated_at < now() - interval '90 seconds'
              then 'offline'
            else om.presence_status
          end as presence_status,
          om.presence_updated_at,
          (om.user_id = ${userId}) as is_current_user
        from public.organization_members om
        left join public.profiles p on p.id = om.user_id
        left join public.legacy_auth_users lau on lau.id = om.user_id
        where om.organization_id = ${organizationId}::uuid
        order by
          case om.presence_status
            when 'online' then 0
            when 'away' then 1
            when 'busy' then 2
            else 3
          end,
          lower(coalesce(nullif(p.full_name, ''), nullif(lau.full_name, ''), om.email, ''))
      `) as MemberRow[];
    } catch (error) {
      // A implantação que ainda não aplicou 0010 continua mostrando a equipe,
      // só que sem tentar inventar uma presença atualizada.
      if (!isUndefinedColumnError(error)) throw error;
      members = (await db`
        select om.user_id, om.email, om.role, om.created_at,
          coalesce(nullif(p.full_name, ''), nullif(lau.full_name, ''), nullif(split_part(om.email, '@', 1), ''), 'Membro da equipe') as full_name,
          'offline' as presence_status,
          null as presence_updated_at,
          (om.user_id = ${userId}) as is_current_user
        from public.organization_members om
        left join public.profiles p on p.id = om.user_id
        left join public.legacy_auth_users lau on lau.id = om.user_id
        where om.organization_id = ${organizationId}::uuid
        order by lower(coalesce(nullif(p.full_name, ''), nullif(lau.full_name, ''), om.email, ''))
      `) as MemberRow[];
    }

    return json({ data: { members } });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorJson('O corpo da requisição deve ser um JSON válido.', 400);
    }

    if (!isRecord(body) || !isUuid(body.organizationId) || !isPresenceStatus(body.status)) {
      return errorJson('Informe a organização e um status de presença válido.', 400);
    }

    const organizationId = body.organizationId;
    const status = body.status;
    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    const role = await getOrganizationRole(db, userId, organizationId);
    if (!role) return errorJson('Você não tem acesso a esta organização.', 403);

    const rows = await db`
      update public.organization_members
      set presence_status = ${status}, presence_updated_at = now()
      where organization_id = ${organizationId}::uuid and user_id = ${userId}
      returning presence_status, presence_updated_at
    ` as Array<{ presence_status: PresenceStatus; presence_updated_at: string }>;

    if (!rows.length) return errorJson('Membro não encontrado nesta organização.', 404);
    return json({ data: { status: rows[0].presence_status, updatedAt: rows[0].presence_updated_at } });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

function isPresenceStatus(value: unknown): value is PresenceStatus {
  return typeof value === 'string' && presenceStatuses.includes(value as PresenceStatus);
}
