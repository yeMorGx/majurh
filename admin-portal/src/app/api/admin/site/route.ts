import { databaseErrorResponse, errorJson, getAdminContext, isRecord, json } from '@/lib/api';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

type SiteSettings = {
  maintenanceMode: boolean;
  publicSiteUrl: string;
  analyticsPropertyId: string;
  analyticsMeasurementId: string;
};

export async function GET() {
  try {
    const context = await getAdminContext();
    if ('response' in context) return context.response;
    if (!context.organizationId) return errorJson('O site ainda não possui uma organização operacional para armazenar estas configurações.', 503);
    const settings = await context.db`
      select maintenance_mode, public_site_url, analytics_property_id, analytics_measurement_id, updated_at
      from public.admin_site_settings
      where organization_id = ${context.organizationId}::uuid
      limit 1
    ` as Array<{ maintenance_mode: boolean; public_site_url: string | null; analytics_property_id: string | null; analytics_measurement_id: string | null; updated_at: string }>;
    const setting = settings[0];
    return json({ data: { available: true, settings: normalizeSettings(setting) } });
  } catch (error) {
    const response = databaseErrorResponse(error);
    return response.status === 503 ? errorJson('A migração do console ainda não foi aplicada no Neon. Execute 0014_admin_site_settings.sql.', 503) : response;
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getAdminContext();
    if ('response' in context) return context.response;
    if (!context.organizationId) return errorJson('O site ainda não possui uma organização operacional para armazenar estas configurações.', 503);
    let body: unknown;
    try { body = await request.json(); } catch { return errorJson('O corpo da requisição deve ser um JSON válido.', 400); }
    if (!isRecord(body)) return errorJson('Informe as configurações do site.', 400);
    const maintenanceMode = body.maintenanceMode === true;
    const publicSiteUrl = typeof body.publicSiteUrl === 'string' ? body.publicSiteUrl.trim() : '';
    const analyticsPropertyId = typeof body.analyticsPropertyId === 'string' ? body.analyticsPropertyId.trim().replace(/^properties\//, '') : '';
    const analyticsMeasurementId = typeof body.analyticsMeasurementId === 'string' ? body.analyticsMeasurementId.trim().toUpperCase() : '';
    if (publicSiteUrl && !isHttpUrl(publicSiteUrl)) return errorJson('Informe uma URL pública começando com http:// ou https://.', 400);
    if (analyticsPropertyId && !/^\d{4,30}$/.test(analyticsPropertyId)) return errorJson('O ID da propriedade GA4 deve conter apenas números.', 400);
    if (analyticsMeasurementId && !/^G-[A-Z0-9]+$/.test(analyticsMeasurementId)) return errorJson('O ID de medição deve seguir o formato G-XXXXXXXXXX.', 400);

    const saved = await context.db`
      insert into public.admin_site_settings (organization_id, maintenance_mode, public_site_url, analytics_property_id, analytics_measurement_id)
      values (${context.organizationId}::uuid, ${maintenanceMode}, ${publicSiteUrl || null}, ${analyticsPropertyId || null}, ${analyticsMeasurementId || null})
      on conflict (organization_id) do update set
        maintenance_mode = excluded.maintenance_mode,
        public_site_url = excluded.public_site_url,
        analytics_property_id = excluded.analytics_property_id,
        analytics_measurement_id = excluded.analytics_measurement_id
      returning maintenance_mode, public_site_url, analytics_property_id, analytics_measurement_id, updated_at
    ` as Array<{ maintenance_mode: boolean; public_site_url: string | null; analytics_property_id: string | null; analytics_measurement_id: string | null; updated_at: string }>;
    return json({ data: { available: true, settings: normalizeSettings(saved[0]) } });
  } catch (error) {
    const response = databaseErrorResponse(error);
    return response.status === 503 ? errorJson('A migração do console ainda não foi aplicada no Neon. Execute 0014_admin_site_settings.sql.', 503) : response;
  }
}

function isHttpUrl(value: string) {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}

function normalizeSettings(setting?: { maintenance_mode: boolean; public_site_url: string | null; analytics_property_id: string | null; analytics_measurement_id: string | null; updated_at: string }): SiteSettings & { updatedAt: string | null } {
  return {
    maintenanceMode: Boolean(setting?.maintenance_mode),
    publicSiteUrl: setting?.public_site_url ?? '',
    analyticsPropertyId: setting?.analytics_property_id ?? '',
    analyticsMeasurementId: setting?.analytics_measurement_id ?? '',
    updatedAt: setting?.updated_at ?? null,
  };
}
