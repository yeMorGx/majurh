import { NextRequest } from 'next/server';
import { databaseErrorResponse, json } from '@/lib/api';
import { ADMIN_SESSION_COOKIE, clearAdminSession } from '@/lib/admin-session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await clearAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
    const response = json({ data: { signedOut: true } });
    response.cookies.set({ name: ADMIN_SESSION_COOKIE, value: '', httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
    return response;
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
