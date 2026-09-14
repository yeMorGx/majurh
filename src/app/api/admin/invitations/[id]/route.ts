import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import { databaseErrorResponse, errorJson, isUuid, json } from '@/lib/api/http';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return errorJson('Convite inválido.', 400);

    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);

    const memberships = await db`
      select organization_id from public.organization_members
      where user_id = ${userId} order by created_at asc limit 1
    ` as Array<{ organization_id: string }>;
    const organizationId = memberships[0]?.organization_id;
    if (!organizationId) return errorJson('Seu usuário ainda não está associado a uma organização.', 403);
    if (await getOrganizationRole(db, userId, organizationId) !== 'admin') {
      return errorJson('Apenas administradores podem revogar convites.', 403);
    }

    const rows = await db`
      delete from public.organization_invitations
      where id = ${id}::uuid and organization_id = ${organizationId}::uuid and accepted_at is null
      returning id
    `;
    if (!rows.length) return errorJson('Convite não encontrado ou já utilizado.', 404);
    return json({ data: { id } });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
