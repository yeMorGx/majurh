import { getDatabase } from '@/lib/neon/db';
import { json } from '@/lib/api/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDatabase();
    const settings = await db`
      select maintenance_mode, public_site_url, updated_at
      from public.admin_site_settings
      order by updated_at desc
      limit 1
    ` as Array<{ maintenance_mode: boolean; public_site_url: string | null; updated_at: string }>;
    const setting = settings[0];
    return json({ data: { maintenanceMode: Boolean(setting?.maintenance_mode), publicSiteUrl: setting?.public_site_url ?? null, updatedAt: setting?.updated_at ?? null } });
  } catch {
    return json({ data: { maintenanceMode: false, publicSiteUrl: null, updatedAt: null } });
  }
}
