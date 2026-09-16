import { JWT } from 'google-auth-library';
import { databaseErrorResponse, getAdminContext, json } from '@/lib/api';

export const dynamic = 'force-dynamic';

type AnalyticsRow = { dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> };

export async function GET() {
  try {
    const context = await getAdminContext();
    if ('response' in context) return context.response;
    if (!context.organizationId) return json({ data: { configured: false, reason: 'O site ainda não possui uma organização operacional para armazenar a configuração do Google Analytics.' } }, 503);
    const settings = await context.db`
      select analytics_property_id
      from public.admin_site_settings
      where organization_id = ${context.organizationId}::uuid
      limit 1
    ` as Array<{ analytics_property_id: string | null }>;
    const propertyId = settings[0]?.analytics_property_id?.replace(/^properties\//, '') ?? '';
    const serviceAccountJson = process.env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON;
    if (!propertyId || !serviceAccountJson) {
      return json({ data: { configured: false, reason: 'Configure a propriedade GA4 e GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON no projeto administrativo.' } });
    }

    let serviceAccount: { client_email: string; private_key: string };
    try {
      serviceAccount = JSON.parse(serviceAccountJson) as { client_email: string; private_key: string };
      if (!serviceAccount.client_email || !serviceAccount.private_key) throw new Error('Credencial incompleta');
    } catch {
      return json({ error: 'A credencial do Google Analytics não é um JSON válido.' }, 503);
    }

    const client = new JWT({ email: serviceAccount.client_email, key: serviceAccount.private_key, scopes: ['https://www.googleapis.com/auth/analytics.readonly'] });
    const token = await client.getAccessToken();
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'eventCount' }],
        dimensions: [{ name: 'date' }],
        orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
      }),
      cache: 'no-store',
    });
    const payload = await response.json() as { rows?: AnalyticsRow[]; error?: { message?: string } };
    if (!response.ok) return json({ error: payload.error?.message || 'O Google Analytics não aceitou a consulta.' }, 502);
    const daily = (payload.rows ?? []).map((row) => ({
      date: row.dimensionValues?.[0]?.value ?? '',
      activeUsers: Number(row.metricValues?.[0]?.value ?? 0),
      sessions: Number(row.metricValues?.[1]?.value ?? 0),
      events: Number(row.metricValues?.[2]?.value ?? 0),
    }));
    return json({ data: { configured: true, propertyId, openUrl: `https://analytics.google.com/analytics/web/#/p${encodeURIComponent(propertyId)}/reports`, daily, totals: daily.reduce((total, item) => ({ activeUsers: total.activeUsers + item.activeUsers, sessions: total.sessions + item.sessions, events: total.events + item.events }), { activeUsers: 0, sessions: 0, events: 0 }) } });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('admin_site_settings') || error.message.includes('does not exist'))) return json({ data: { configured: false, reason: 'A migração do console ainda não foi aplicada no Neon.' } }, 503);
    return databaseErrorResponse(error);
  }
}
