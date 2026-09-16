import { createHash, randomBytes } from 'node:crypto';

import { getAdminContext } from '@/lib/api/admin-context';
import { findMembershipsByEmail } from '@/lib/api/member-email';
import { databaseErrorResponse, errorJson, isRecord, json } from '@/lib/api/http';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const context = await getAdminContext();
    if ('response' in context) return context.response;

    const [invitations, members] = await Promise.all([
      context.db`
        select id, email, role, expires_at, created_at
        from public.organization_invitations
        where organization_id = ${context.organizationId}::uuid
          and accepted_at is null
          and expires_at > now()
        order by created_at desc
      `,
      context.db`
        select om.user_id, om.email, om.role, om.created_at,
          coalesce(nullif(p.full_name, ''), nullif(lau.full_name, ''), 'Membro da equipe') as full_name
        from public.organization_members om
        left join public.profiles p on p.id = om.user_id
        left join public.legacy_auth_users lau on lau.id = om.user_id
        where om.organization_id = ${context.organizationId}::uuid
        order by om.created_at asc
      `,
    ]);

    return json({ data: { organizationId: context.organizationId, invitations, members } });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorJson('O corpo da requisição deve ser um JSON válido.', 400);
    }

    if (!isRecord(body) || typeof body.email !== 'string') {
      return errorJson('Informe o e-mail da pessoa convidada.', 400);
    }

    const email = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return errorJson('Informe um e-mail válido.', 400);
    }

    const role = body.role === 'viewer' ? 'viewer' : body.role === 'manager' ? 'manager' : body.role === 'recruiter' || body.role === undefined ? 'recruiter' : null;
    if (!role) return errorJson('Escolha um papel válido para o convite.', 400);

    const context = await getAdminContext();
    if ('response' in context) return context.response;

    await context.db`
      delete from public.organization_invitations
      where organization_id = ${context.organizationId}::uuid
        and lower(email) = ${email}
        and accepted_at is null
        and expires_at <= now()
    `;

    const existingMembers = await findMembershipsByEmail(context.db, email);
    const existingOtherOrganization = existingMembers.find(
      (member) => member.organization_id !== context.organizationId,
    );
    if (existingOtherOrganization) {
      return json({
        error: `Este e-mail já está vinculado à organização "${existingOtherOrganization.organization_name}". Uma pessoa só pode pertencer a uma organização.`,
        code: 'EMAIL_ALREADY_IN_ORGANIZATION',
      }, 409);
    }
    if (existingMembers.some((member) => member.organization_id === context.organizationId)) {
      return errorJson('Este e-mail já faz parte da organização.', 409);
    }

    const pendingInvite = await context.db`
      select 1 from public.organization_invitations
      where organization_id = ${context.organizationId}::uuid
        and lower(email) = ${email}
        and accepted_at is null
        and expires_at > now()
      limit 1
    `;
    if (pendingInvite.length) return errorJson('Já existe um convite pendente para este e-mail.', 409);

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const rows = await context.db`
      insert into public.organization_invitations (organization_id, email, role, token_hash, invited_by, expires_at)
      values (${context.organizationId}::uuid, ${email}, ${role}::public.app_role, ${tokenHash}, ${context.userId}, ${expiresAt})
      returning id, email, role, expires_at, created_at
    `;

    return json({
      data: {
        invitation: rows[0],
        inviteUrl: new URL(`/convite/${token}`, request.url).toString(),
      },
    }, 201);
  } catch (error) {
    return databaseErrorResponse(error, { duplicateMessage: 'Já existe um convite para este e-mail.' });
  }
}
