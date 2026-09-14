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
    const { db, userId, email } = await getAuthenticatedClient();
    if (!userId) {
      return errorJson('É necessário estar autenticado.', 401);
    }

    const [profiles, memberships] = await Promise.all([
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
    ]);

    const profile = profiles[0] ?? null;
    const membership = memberships[0] ?? null;
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
      },
    });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
