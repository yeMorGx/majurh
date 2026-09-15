import { encryptIntegrationCredentials } from '@/lib/integrations/crypto';
import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import { databaseErrorResponse, errorJson, isRecord, json } from '@/lib/api/http';
import { isIntegrationProvider } from '@/lib/integrations/providers';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ provider: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { provider: rawProvider } = await context.params;
    if (!isIntegrationProvider(rawProvider)) return errorJson('Provedor de integração inválido.', 404);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorJson('O corpo da requisição deve ser um JSON válido.', 400);
    }

    if (!isRecord(body)) return errorJson('Informe as credenciais da integração.', 400);
    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);

    const memberships = await db`
      select organization_id
      from public.organization_members
      where user_id = ${userId}
      order by created_at asc
      limit 1
    ` as Array<{ organization_id: string }>;
    const organizationId = memberships[0]?.organization_id;
    if (!organizationId) return errorJson('Seu usuário ainda não está associado a uma organização.', 403);

    const role = await getOrganizationRole(db, userId, organizationId);
    if (role !== 'admin') return errorJson('Apenas administradores podem configurar integrações.', 403);

    const disconnect = body.disconnect === true;
    if (disconnect) {
      const rows = await db`
        update public.organization_integrations
        set status = 'disconnected', credentials_ciphertext = null,
          credentials_updated_at = null, last_error = null
        where organization_id = ${organizationId}::uuid and provider = ${rawProvider}
        returning provider, status, external_account_id, credentials_updated_at, last_sync_at, last_error, metadata
      `;
      return json({ data: { integration: rows[0] ?? { provider: rawProvider, status: 'disconnected' } } });
    }

    const credentials = readCredentials(body.credentials);
    if (credentials === 'invalid') return errorJson('As credenciais devem ser textos simples e ter no máximo 5.000 caracteres por campo.', 400);
    if (!credentials || Object.keys(credentials).length === 0) return errorJson('Informe ao menos uma credencial para conectar o provedor.', 400);

    const externalAccountId = readOptionalString(body.externalAccountId, 160);
    if (externalAccountId === 'invalid') return errorJson('O identificador externo é inválido.', 400);

    const metadata = readMetadata(body.metadata);
    if (metadata === 'invalid') return errorJson('Os metadados da integração devem ser textos simples e limitados.', 400);

    const ciphertext = encryptIntegrationCredentials(credentials);
    const rows = await db`
      insert into public.organization_integrations (
        organization_id, provider, status, external_account_id,
        credentials_ciphertext, credentials_updated_at, last_error, metadata
      ) values (
        ${organizationId}::uuid, ${rawProvider}, 'pending', ${externalAccountId || null},
        ${ciphertext}, now(), null, ${JSON.stringify(metadata ?? {})}::jsonb
      )
      on conflict (organization_id, provider) do update set
        status = 'pending',
        external_account_id = excluded.external_account_id,
        credentials_ciphertext = excluded.credentials_ciphertext,
        credentials_updated_at = now(),
        last_error = null,
        metadata = excluded.metadata
      returning provider, status, external_account_id, credentials_updated_at, last_sync_at, last_error, metadata
    `;

    return json({ data: { integration: rows[0] } });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

function readCredentials(value: unknown): Record<string, string> | 'invalid' | null {
  if (value === undefined || value === null) return null;
  if (!isRecord(value)) return 'invalid';

  const entries = Object.entries(value);
  for (const [key, item] of entries) {
    if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,60}$/.test(key) || typeof item !== 'string' || item.length > 5000) {
      return 'invalid';
    }
  }
  return Object.fromEntries(entries.map(([key, item]) => [key, (item as string).trim()]));
}

function readMetadata(value: unknown): Record<string, string> | 'invalid' | null {
  if (value === undefined || value === null) return null;
  if (!isRecord(value)) return 'invalid';

  const entries = Object.entries(value);
  for (const [key, item] of entries) {
    if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,60}$/.test(key) || typeof item !== 'string' || item.length > 500) {
      return 'invalid';
    }
  }
  return Object.fromEntries(entries.map(([key, item]) => [key, (item as string).trim()]));
}

function readOptionalString(value: unknown, maxLength: number): string | null | 'invalid' {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return 'invalid';
  const normalized = value.trim();
  return normalized.length <= maxLength ? normalized || null : 'invalid';
}
