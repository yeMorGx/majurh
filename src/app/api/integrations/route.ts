import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import { databaseErrorResponse, errorJson, json } from '@/lib/api/http';
import { integrationProviderCatalog, integrationProviders, type IntegrationStatus } from '@/lib/integrations/providers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);

    const memberships = await db`
      select organization_id, role
      from public.organization_members
      where user_id = ${userId}
      order by created_at asc
      limit 1
    ` as Array<{ organization_id: string; role: string }>;
    const membership = memberships[0];
    if (!membership) return errorJson('Seu usuário ainda não está associado a uma organização.', 403);

    const rows = await db`
      select provider, status, external_account_id, credentials_updated_at,
        last_sync_at, last_error, metadata
      from public.organization_integrations
      where organization_id = ${membership.organization_id}::uuid
      order by provider asc
    ` as Array<{
      provider: string;
      status: IntegrationStatus;
      external_account_id: string | null;
      credentials_updated_at: string | null;
      last_sync_at: string | null;
      last_error: string | null;
      metadata: Record<string, unknown>;
    }>;
    const byProvider = new Map(rows.map((row) => [row.provider, row]));

    return json({
      data: {
        organizationId: membership.organization_id,
        role: await getOrganizationRole(db, userId, membership.organization_id),
        providers: integrationProviders.map((provider) => ({
          provider,
          ...integrationProviderCatalog[provider],
          ...(byProvider.get(provider) ?? {
            status: 'disconnected' as const,
            external_account_id: null,
            credentials_updated_at: null,
            last_sync_at: null,
            last_error: null,
            metadata: {},
          }),
        })),
      },
    });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
