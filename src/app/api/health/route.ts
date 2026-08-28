import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  return NextResponse.json(
    {
      ok: hasSupabaseConfig,
      service: 'vieira-couto-rh',
      supabaseConfigured: hasSupabaseConfig,
    },
    { status: hasSupabaseConfig ? 200 : 503 },
  );
}
