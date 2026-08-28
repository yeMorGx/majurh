import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { getPublicEnv } from '@/lib/env';
import type { Database } from '@/types/database.types';

const publicPaths = ['/login', '/api/health'];

function isPublicPath(pathname: string) {
  return publicPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export async function updateSession(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  let supabaseUrl: string;
  let supabasePublishableKey: string;

  try {
    ({ supabaseUrl, supabasePublishableKey } = getPublicEnv());
  } catch (error) {
    if (!isMissingConfigurationError(error)) {
      throw error;
    }

    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Supabase não está configurado neste ambiente.' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('configuration', 'missing');
    return NextResponse.redirect(redirectUrl);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims && !isPublicPath(request.nextUrl.pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname);

    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

function isMissingConfigurationError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.startsWith('Variável de ambiente obrigatória ausente:')
  );
}
