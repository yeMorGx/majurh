import { createClient } from '@/lib/supabase/server';

export async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as { sub?: unknown; email?: unknown } | undefined;
  const userId = typeof claims?.sub === 'string' ? claims.sub : null;
  const email = typeof claims?.email === 'string' ? claims.email : null;

  return { supabase, userId, email };
}
