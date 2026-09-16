import { createNeonAuth } from '@neondatabase/auth/next/server';

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

if (!baseUrl) throw new Error('Variável de ambiente obrigatória ausente: NEON_AUTH_BASE_URL');
if (!cookieSecret) throw new Error('Variável de ambiente obrigatória ausente: NEON_AUTH_COOKIE_SECRET');

export const auth = createNeonAuth({
  baseUrl,
  cookies: { secret: cookieSecret, sessionDataTtl: 300 },
});
