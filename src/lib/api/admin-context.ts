import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import { errorJson } from '@/lib/api/http';

/**
 * Resolve o primeiro espaço da pessoa autenticada e garante que ela é
 * administradora no domínio do Majurh. A permissão do app fica separada da
 * role interna do Neon Auth.
 */
export async function getAdminContext() {
  const { db, userId, email } = await getAuthenticatedClient();
  if (!userId) return { response: errorJson('É necessário estar autenticado.', 401) } as const;

  const memberships = await db`
    select om.organization_id, o.name, o.slug
    from public.organization_members om
    join public.organizations o on o.id = om.organization_id
    where om.user_id = ${userId}
    order by om.created_at asc
    limit 1
  ` as Array<{ organization_id: string; name: string; slug: string }>;

  const membership = memberships[0];
  if (!membership) {
    return { response: errorJson('Seu usuário ainda não está associado a uma organização.', 403) } as const;
  }

  const role = await getOrganizationRole(db, userId, membership.organization_id);
  if (role !== 'admin') {
    return { response: errorJson('Apenas administradores podem gerenciar acessos.', 403) } as const;
  }

  return {
    db,
    userId,
    email,
    organizationId: membership.organization_id,
    organization: { name: membership.name, slug: membership.slug },
  } as const;
}
