import { auth } from '@/lib/auth/server';
import { NextRequest, NextResponse } from 'next/server';

const handlers = auth.handler();

type AuthHandlerContext = Parameters<typeof handlers.POST>[1];

export async function GET(request: NextRequest, context: AuthHandlerContext) { return handlers.GET(request, context); }
export async function PUT(request: NextRequest, context: AuthHandlerContext) { return handlers.PUT(request, context); }
export async function PATCH(request: NextRequest, context: AuthHandlerContext) { return handlers.PATCH(request, context); }
export async function DELETE(request: NextRequest, context: AuthHandlerContext) { return handlers.DELETE(request, context); }

export async function POST(request: NextRequest, context: AuthHandlerContext) {
  if (request.nextUrl.pathname.endsWith('/sign-up/email')) {
    return NextResponse.json({ error: 'O cadastro público está desativado. Peça acesso a um administrador.' }, { status: 403 });
  }
  return handlers.POST(request, context);
}
