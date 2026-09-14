import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@/lib/auth/server';

const publicPaths = ['/login', '/convite', '/api/health', '/api/auth', '/api/branding', '/api/invitations'];

function isPublicPath(pathname: string) {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

const neonMiddleware = auth.middleware({ loginUrl: '/login' });

export async function proxy(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  return neonMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
