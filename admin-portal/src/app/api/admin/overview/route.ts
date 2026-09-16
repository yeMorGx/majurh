import { getAdminContext, databaseErrorResponse, json } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const context = await getAdminContext();
    if ('response' in context) return context.response;

    const [members, counts] = await Promise.all([
      context.db`
        select user_id, email, full_name, is_active, created_at
        from public.site_access_users
        order by is_active desc, created_at desc
      `,
      context.db`
        select
          (select count(*)::int from public.site_access_users where is_active = true) as members,
          (select count(*)::int from public.candidates) as candidates,
          (select count(*)::int from public.recruitment_processes) as processes,
          (select count(*)::int from public.candidate_documents where status in ('pending', 'in_review', 'request_again')) as pending_documents
      `,
    ]) as [Array<Record<string, unknown>>, Array<{ members: number; candidates: number; processes: number; pending_documents: number }>];

    let site = {
      available: false,
      maintenanceMode: false,
      publicSiteUrl: '',
      analyticsPropertyId: '',
      analyticsMeasurementId: '',
      updatedAt: null as string | null,
    };

    try {
      if (!context.organizationId) throw new Error('Nenhuma organização operacional cadastrada.');
      const settings = await context.db`
        select maintenance_mode, public_site_url, analytics_property_id, analytics_measurement_id, updated_at
        from public.admin_site_settings
        where organization_id = ${context.organizationId}::uuid
        limit 1
      ` as Array<{ maintenance_mode: boolean; public_site_url: string | null; analytics_property_id: string | null; analytics_measurement_id: string | null; updated_at: string }>;
      const setting = settings[0];
      site = {
        available: true,
        maintenanceMode: Boolean(setting?.maintenance_mode),
        publicSiteUrl: setting?.public_site_url ?? '',
        analyticsPropertyId: setting?.analytics_property_id ?? '',
        analyticsMeasurementId: setting?.analytics_measurement_id ?? '',
        updatedAt: setting?.updated_at ?? null,
      };
    } catch {
      // O painel continua útil antes da migração, mas sinaliza a pendência ao salvar.
    }

    return json({
      data: {
        organization: context.organization,
        scope: context.scope,
        members,
        metrics: counts[0] ?? { members: 0, candidates: 0, processes: 0, pending_documents: 0 },
        site,
      },
    });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
