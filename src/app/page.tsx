import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();

    if (!data?.claims) {
      redirect('/login');
    }

    redirect('/dashboard');
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('Variável de ambiente obrigatória ausente:')
    ) {
      redirect('/login?configuration=missing');
    }

    throw error;
  }
}
