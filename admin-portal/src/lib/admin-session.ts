import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { getDatabase, type DatabaseClient } from '@/lib/neon/db';

export const ADMIN_SESSION_COOKIE = 'majurh_admin_session';
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

export type AdminSession = {
  db: DatabaseClient;
  userId: string;
  email: string;
  fullName: string;
};

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const digest = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${digest}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, digest] = storedHash.split(':');
  if (algorithm !== 'scrypt' || !salt || !digest || digest.length !== 128) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(digest, 'hex');
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createAdminSession(db: DatabaseClient, userId: string) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(token);
  await db`
    insert into public.site_admin_sessions (admin_user_id, token_hash, expires_at)
    values (${userId}, ${tokenHash}, now() + interval '8 hours')
  `;
  return token;
}

export function attachAdminSession(response: NextResponse, token: string) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });
  return response;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDatabase();
  const sessions = await db`
    select sa.user_id, sa.email, coalesce(nullif(sa.full_name, ''), 'Administrador') as full_name
    from public.site_admin_sessions sas
    join public.site_admins sa on sa.user_id = sas.admin_user_id
    where sas.token_hash = ${hashSessionToken(token)}
      and sas.expires_at > now()
      and sa.is_active = true
    limit 1
  ` as Array<{ user_id: string; email: string; full_name: string }>;
  const session = sessions[0];
  if (!session) return null;
  return { db, userId: session.user_id, email: session.email, fullName: session.full_name };
}

export async function clearAdminSession(token?: string) {
  if (!token) return;
  const db = getDatabase();
  await db`delete from public.site_admin_sessions where token_hash = ${hashSessionToken(token)}`;
}
