import { getAuthenticatedClient } from '@/lib/api/auth';
import {
  databaseErrorResponse,
  errorJson,
  isUndefinedColumnError,
  json,
} from '@/lib/api/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { db, userId, authUserId, email } = await getAuthenticatedClient();
    if (!userId) {
      return errorJson('É necessário estar autenticado.', 401);
    }

    const [profiles, memberships, accessRows, onboardingRows] = await Promise.all([
      db`
        select id, full_name, avatar_url
        from public.profiles
        where id = ${userId}
        limit 1
      `,
      db`
        select organization_id, role
        from public.organization_members
        where user_id = ${userId}
        order by created_at asc
        limit 1
      `,
      db`
        select user_id, email, is_active, must_change_password, onboarding_completed_at
        from public.site_access_users
        where user_id = ${authUserId ?? userId}
        limit 1
      `,
      db`
        select preferred_name, birth_date, phone, avatar_path, lead_source,
          referral_name, primary_goal, completed_at
        from public.user_onboarding_profiles
        where user_id = ${authUserId ?? userId}
        limit 1
      `,
    ]);

    const profile = profiles[0] ?? null;
    const membership = memberships[0] ?? null;
    const siteAccess = accessRows[0]
      ? {
          isActive: Boolean(accessRows[0].is_active),
          mustChangePassword: Boolean(accessRows[0].must_change_password),
          onboardingCompletedAt: accessRows[0].onboarding_completed_at ?? null,
          onboardingCompleted: Boolean(accessRows[0].onboarding_completed_at),
        }
      : null;
    let organization = null;

    if (membership) {
      try {
        const organizations = await db`
          select id, name, slug, brand_logo_path, brand_primary_color, brand_accent_color,
            brand_login_banner_path, brand_login_kicker, brand_login_headline, brand_login_description
          from public.organizations
          where id = ${membership.organization_id}::uuid
          limit 1
        `;
        organization = organizations[0] ?? null;
      } catch (error) {
        // Permite que deploys feitos antes da migração white-label continuem
        // carregando o app. A identidade da plataforma será usada nesse caso.
        if (!isUndefinedColumnError(error)) {
          throw error;
        }

        const organizations = await db`
          select id, name, slug
          from public.organizations
          where id = ${membership.organization_id}::uuid
          limit 1
        `;
        organization = organizations[0] ?? null;
      }
    }

    return json({
      data: {
        user: { id: userId, email },
        profile,
        membership,
        organization,
        siteAccess,
        onboarding: onboardingRows[0] ?? null,
      },
    });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
