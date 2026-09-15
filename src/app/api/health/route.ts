import { NextResponse } from 'next/server';
import { getDatabaseConnectionString } from '@/lib/neon/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hasNeonConfig = Boolean(
    getDatabaseConnectionString() &&
      process.env.NEON_AUTH_BASE_URL &&
      process.env.NEON_AUTH_COOKIE_SECRET,
  );

  return NextResponse.json(
    {
      ok: hasNeonConfig,
      service: 'majurh',
      neonConfigured: hasNeonConfig,
    },
    { status: hasNeonConfig ? 200 : 503 },
  );
}
