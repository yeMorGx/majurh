import { getAdminContext, databaseErrorResponse, json } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const context = await getAdminContext();
    if ('response' in context) return context.response;

    const [members, counts] = await Promise.all([
      context.db`
        select om.user_id, om.email, om.role, om.created_at,
          coalesce(nullif(p.full_name, ''), nullif(lau.full_name, ''), 'Membro da equipe') as full_name
        from public.organization_members om
        left join public.profiles p on p.id = om.user_id
        left join public.legacy_auth_users lau on lau.id = om.user_id
        where om.organization_id = ${context.organizationId}::uuid
        order by om.created_at desc
      `,
      context.db`
        select
          (select count(*)::int from public.organization_members where organization_id = ${context.organizationId}::uuid) as members,
          (select count(*)::int from public.candidates where organization_id = ${context.organizationId}::uuid) as candidates,
          (select count(*)::int from public.recruitment_processes where organization_id = ${context.organizationId}::uuid) as processes,
          (select count(*)::int from public.candidate_documents where organization_id = ${context.organizationId}::uuid and status in ('pending', 'in_review', 'request_again')) as pending_documents
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
