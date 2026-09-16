import { createNeonAuth } from '@neondatabase/auth/next/server';

type NeonAuth = ReturnType<typeof createNeonAuth>;

export function getAuth() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl) throw new Error('Variável de ambiente obrigatória ausente: NEON_AUTH_BASE_URL');
  if (!cookieSecret) throw new Error('Variável de ambiente obrigatória ausente: NEON_AUTH_COOKIE_SECRET');
  return createNeonAuth({
    baseUrl,
    cookies: { secret: cookieSecret, sessionDataTtl: 300 },
  });
}

// Compatibilidade com o proxy compartilhado quando o pacote local `majurh`
// é resolvido durante o build do console. A configuração só é lida ao usar a
// API, não durante a compilação estática.
export const auth = new Proxy({} as NeonAuth, {
  get(_target, property: string | symbol) {
    return getAuth()[property as keyof NeonAuth];
  },
});
