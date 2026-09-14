import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hasNeonConfig = Boolean(
    process.env.DATABASE_URL &&
      process.env.NEON_AUTH_BASE_URL &&
      process.env.NEON_AUTH_COOKIE_SECRET,
  );

  return NextResponse.json(
    {
      ok: hasNeonConfig,
      service: 'vieira-couto-rh',
      neonConfigured: hasNeonConfig,
    },
    { status: hasNeonConfig ? 200 : 503 },
  );
}
