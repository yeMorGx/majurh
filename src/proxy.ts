import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@/lib/auth/server';

const publicPaths = ['/login', '/reset-password', '/convite', '/api/health', '/api/auth', '/api/branding', '/api/invitations'];

function isPublicPath(pathname: string) {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  // O console administrativo é um projeto Vercel separado. Este middleware
  // protege apenas o produto operacional.
  return auth.middleware({ loginUrl: '/login' })(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
