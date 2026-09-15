import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@/lib/auth/server';

const publicPaths = ['/login', '/convite', '/api/health', '/api/auth', '/api/branding', '/api/invitations'];

function isPublicPath(pathname: string) {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  const hostname = request.nextUrl.hostname.toLowerCase();
  const isAdminSubdomain = hostname.startsWith('admin.');
  const loginUrl = isAdminSubdomain ? '/login?redirectedFrom=/admin' : '/login';

  // A mesma aplicação atende o domínio principal e o console isolado. No
  // subdomínio admin, o middleware direciona o visitante para o console
  // correto após autenticar, sem expor essa tela na navegação do app.
  return auth.middleware({ loginUrl })(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
