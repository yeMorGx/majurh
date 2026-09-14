import { createHash } from 'node:crypto';

import { getAuthenticatedClient } from '@/lib/api/auth';
import { databaseErrorResponse, errorJson, isRecord, json } from '@/lib/api/http';
import { getDatabase } from '@/lib/neon/db';

export const dynamic = 'force-dynamic';

type InvitationRow = {
  id: string;
  email: string;
  role: 'admin' | 'recruiter' | 'viewer';
  expires_at: string | Date;
  accepted_at: string | Date | null;
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  brand_logo_path: string | null;
  brand_primary_color: string | null;
  brand_accent_color: string | null;
  brand_login_banner_path: string | null;
  brand_login_kicker: string | null;
  brand_login_headline: string | null;
  brand_login_description: string | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const token = await readToken(params);
    if (!token) return errorJson('Convite inválido.', 400);

    const invite = await findInvitation(token);
    const validation = validateInvitation(invite);
    if (validation) return validation;

    return json({ data: { invitation: toPublicInvitation(invite) } });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const token = await readToken(params);
    if (!token) return errorJson('Convite inválido.', 400);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorJson('O corpo da requisição deve ser um JSON válido.', 400);
    }
    if (!isRecord(body) || typeof body.fullName !== 'string') return errorJson('Informe seu nome completo.', 400);

    const fullName = body.fullName.trim();
    if (fullName.length < 2 || fullName.length > 120) return errorJson('O nome deve ter entre 2 e 120 caracteres.', 400);

    const invite = await findInvitation(token);
    const validation = validateInvitation(invite);
    if (validation) return validation;

    const { db, userId, email } = await getAuthenticatedClient();
    if (!userId || !email) return errorJson('Entre ou crie sua conta pelo convite antes de continuar.', 401);
    if (email.trim().toLowerCase() !== invite.email.trim().toLowerCase()) {
      return errorJson('Este convite foi enviado para outro e-mail.', 403);
    }

    const claimed = await db`
      update public.organization_invitations
      set accepted_at = now()
      where id = ${invite.id}::uuid and accepted_at is null and expires_at > now()
      returning id
    `;
    if (!claimed.length) return errorJson('Este convite já foi utilizado ou expirou.', 409);

    await db`
      insert into public.profiles (id, full_name)
      values (${userId}, ${fullName})
      on conflict (id) do update set full_name = excluded.full_name
    `;
    await db`
      insert into public.organization_members (organization_id, user_id, email, role)
      values (${invite.organization_id}::uuid, ${userId}, ${email.toLowerCase()}, ${invite.role}::public.app_role)
      on conflict (organization_id, user_id) do update
        set email = excluded.email, role = excluded.role
    `;

    return json({
      data: {
        organization: {
          id: invite.organization_id,
          name: invite.organization_name,
          slug: invite.organization_slug,
        },
        membership: { role: invite.role },
      },
    });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

async function readToken(params: Promise<{ token: string }>) {
  const { token } = await params;
  return /^[A-Za-z0-9_-]{40,100}$/.test(token) ? token : null;
}

async function findInvitation(token: string) {
  const db = getDatabase();
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const rows = await db`
    select i.id, i.email, i.role, i.expires_at, i.accepted_at, i.organization_id,
      o.name as organization_name, o.slug as organization_slug,
      o.brand_logo_path, o.brand_primary_color, o.brand_accent_color,
      o.brand_login_banner_path, o.brand_login_kicker, o.brand_login_headline, o.brand_login_description
    from public.organization_invitations i
    join public.organizations o on o.id = i.organization_id
    where i.token_hash = ${tokenHash}
    limit 1
  ` as InvitationRow[];
  return rows[0] ?? null;
}

function validateInvitation(invite: InvitationRow | null) {
  if (!invite) return errorJson('Convite não encontrado.', 404);
  if (invite.accepted_at) return errorJson('Este convite já foi utilizado.', 410);
  if (new Date(invite.expires_at).getTime() <= Date.now()) return errorJson('Este convite expirou. Solicite um novo link ao administrador.', 410);
  return null;
}

function toPublicInvitation(invite: InvitationRow) {
  return {
    email: invite.email,
    role: invite.role,
    expires_at: invite.expires_at,
    organization: {
      id: invite.organization_id,
      name: invite.organization_name,
      slug: invite.organization_slug,
      brand_logo_path: invite.brand_logo_path,
      brand_primary_color: invite.brand_primary_color,
      brand_accent_color: invite.brand_accent_color,
      brand_login_banner_path: invite.brand_login_banner_path,
      brand_login_kicker: invite.brand_login_kicker,
      brand_login_headline: invite.brand_login_headline,
      brand_login_description: invite.brand_login_description,
    },
  };
}
