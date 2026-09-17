import { databaseErrorResponse, errorJson, getAdminContext, isRecord, json } from '@/lib/api';
import { hashNeonAuthPassword } from '@/lib/neon-auth-password';
import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const context = await getAdminContext();
    if ('response' in context) return context.response;

    const members = await context.db`
      select sau.user_id, sau.email,
        coalesce(nullif(btrim(sau.full_name), ''), nullif(split_part(sau.email, '@', 1), ''), 'Usuário') as full_name,
        sau.is_active, sau.must_change_password, sau.onboarding_completed_at, sau.created_at,
        uop.preferred_name, uop.birth_date, uop.phone, uop.lead_source,
        uop.referral_name, uop.primary_goal, org.organization_name
      from public.site_access_users sau
      left join public.user_onboarding_profiles uop on uop.user_id = sau.user_id
      left join lateral (
        select o.name as organization_name
        from public.organization_members om
        join public.organizations o on o.id = om.organization_id
        where om.user_id = sau.user_id
        order by om.created_at asc
        limit 1
      ) org on true
      order by is_active desc, created_at asc
    `;

    return json({ data: { scope: context.scope, members } });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return errorJson('O corpo da requisição deve ser um JSON válido.', 400); }
    if (!isRecord(body)) return errorJson('Informe os dados do novo acesso.', 400);

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!isValidEmail(email)) return errorJson('Informe um e-mail válido.', 400);
    if (password.length < 8 || password.length > 128) return errorJson('A senha deve ter entre 8 e 128 caracteres.', 400);

    const context = await getAdminContext();
    if ('response' in context) return context.response;

    const existingAccess = await context.db`
      select user_id, is_active
      from public.site_access_users
      where lower(btrim(email)) = lower(btrim(${email}))
      limit 1
    ` as Array<{ user_id: string; is_active: boolean }>;
    if (existingAccess[0]) {
      return errorJson(
        existingAccess[0].is_active
          ? 'Este e-mail já possui acesso ao Majurh.'
          : 'Este e-mail possui um acesso revogado. Reative ou altere o e-mail antes de criar outro acesso.',
        409,
      );
    }

    const existingAuthUser = await context.db`
      select id
      from neon_auth."user"
      where lower(email) = lower(${email})
      limit 1
    ` as Array<{ id: string }>;
    if (existingAuthUser[0]) return errorJson('Este e-mail já possui uma conta no Neon Auth.', 409);

    // O Neon Auth exige um nome técnico, mas esse valor não é o nome de perfil:
    // a pessoa define o nome real no onboarding do Majurh.
    const authName = email.split('@')[0].replace(/[^a-zA-ZÀ-ÿ0-9 _-]/g, '').trim().slice(0, 120) || 'Usuário';
    const authUserId = randomUUID();
    const passwordHash = await hashNeonAuthPassword(password);
    try {
      await context.db.transaction((tx) => [
        tx`
          insert into neon_auth."user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
          values (${authUserId}::uuid, ${authName}, ${email}, false, now(), now())
        `,
        tx`
          insert into neon_auth.account ("accountId", "providerId", "userId", password, "createdAt", "updatedAt")
          values (${authUserId}, 'credential', ${authUserId}::uuid, ${passwordHash}, now(), now())
        `,
        tx`
          insert into public.site_access_users (user_id, email, full_name, is_active, created_by, must_change_password)
          values (${authUserId}, ${email}, null, true, ${context.userId}, true)
        `,
      ]);
    } catch (error) {
      throw error;
    }

    return json({
      data: {
        user: { id: authUserId, name: null, email, isActive: true, mustChangePassword: true },
        scope: 'global',
        organizationCreatedByUser: true,
      },
    }, 201);
  } catch (error) {
    return databaseErrorResponse(error, 'Este e-mail já possui um acesso.');
  }
}

function isValidEmail(value: string) { return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value); }
