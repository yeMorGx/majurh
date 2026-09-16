import { del, put } from '@vercel/blob';
import { getAuthenticatedClient, getOrganizationRole } from '@/lib/api/auth';
import { companyLogoPath, validateCompanyLogo } from '@/lib/companies/assets';
import { companySelect, companySelectBase } from '@/lib/companies/constants';
import { parseCompanyPayload } from '@/lib/companies/validation';
import { databaseErrorResponse, errorJson, isRecord, isUndefinedColumnError, isUuid, json } from '@/lib/api/http';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId');
    if (!isUuid(organizationId)) return errorJson('Informe um organizationId válido.', 400);
    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    if (!await getOrganizationRole(db, userId, organizationId)) return errorJson('Você não tem acesso a esta organização.', 403);
    const activeOnly = request.nextUrl.searchParams.get('activeOnly') !== 'false';
    let rows;
    try {
      rows = await db.query(
        `select ${companySelect} from public.companies where organization_id = $1 ${activeOnly ? 'and is_active = true' : ''} order by name asc`,
        [organizationId],
      );
    } catch (error) {
      if (!isUndefinedColumnError(error)) throw error;
      rows = await db.query(
        `select ${companySelectBase}, null::text as logo_path from public.companies where organization_id = $1 ${activeOnly ? 'and is_active = true' : ''} order by name asc`,
        [organizationId],
      );
    }
    return json({ data: rows });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  let uploadedPath: string | null = null;
  try {
    const { organizationId, body, logo } = await readRequestData(request);
    if (!isUuid(organizationId)) return errorJson('Informe um organizationId válido.', 400);
    const { db, userId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    const role = await getOrganizationRole(db, userId, organizationId);
    if (!role || !['admin', 'recruiter'].includes(role)) return errorJson('Você não tem permissão para cadastrar empresas.', 403);
    const parsed = parseCompanyPayload(body, 'create');
    if (!parsed.ok) return json({ error: 'Dados da empresa inválidos.', fields: parsed.errors }, 400);
    const value = parsed.data;
    if (logo) {
      const logoError = validateCompanyLogo(logo);
      if (logoError) return errorJson(logoError, 400);
      uploadedPath = companyLogoPath(organizationId, crypto.randomUUID(), logo.type);
      await put(uploadedPath, logo, { access: 'private', contentType: logo.type, addRandomSuffix: false });
    }
    let rows;
    try {
      rows = await db`
        insert into public.companies (organization_id, name, legal_name, cnpj, logo_path)
        values (${organizationId}, ${value.name}, ${value.legal_name ?? null}, ${value.cnpj ?? null}, ${uploadedPath})
        returning ${db.unsafe(companySelect)}
      `;
    } catch (error) {
      if (!isUndefinedColumnError(error)) throw error;
      if (uploadedPath) {
        try { await del(uploadedPath); } catch { /* compensação best-effort */ }
        uploadedPath = null;
        return errorJson('O banco precisa da migração 0009 para aceitar logos de empresas.', 503);
      }
      rows = await db`
        insert into public.companies (organization_id, name, legal_name, cnpj)
        values (${organizationId}, ${value.name}, ${value.legal_name ?? null}, ${value.cnpj ?? null})
        returning ${db.unsafe(companySelectBase)}, null::text as logo_path
      `;
    }
    return json({ data: rows[0] }, 201);
  } catch (error) {
    if (uploadedPath) {
      try { await del(uploadedPath); } catch { /* compensação best-effort */ }
    }
    return databaseErrorResponse(error, { duplicateMessage: 'Esta empresa já está cadastrada nesta organização.' });
  }
}

async function readRequestData(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const organizationId = formData.get('organizationId');
    const logoValue = formData.get('logo');
    const body = Object.fromEntries(
      [...formData.entries()]
        .filter(([key, value]) => key !== 'organizationId' && key !== 'logo' && typeof value === 'string'),
    );
    return { organizationId, body, logo: logoValue instanceof File ? logoValue : null };
  }

  const body = await readJson(request);
  return {
    organizationId: isRecord(body) ? body.organizationId : null,
    body: isRecord(body)
      ? Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'organizationId'))
      : body,
    logo: null,
  };
}

async function readJson(request: NextRequest) {
  try { return await request.json() as unknown; } catch { return null; }
}
