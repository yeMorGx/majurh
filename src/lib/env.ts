type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

function requiredPublicEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }

  return value;
}

export function getPublicEnv(): PublicEnv {
  return {
    // Acesso estático é necessário para o Next.js incorporar NEXT_PUBLIC_* no bundle do navegador.
    supabaseUrl: requiredPublicEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
    supabasePublishableKey: requiredPublicEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
  };
}
