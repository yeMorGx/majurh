import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

export type DatabaseClient = NeonQueryFunction<false, false>;

let client: DatabaseClient | undefined;

export function getDatabase(): DatabaseClient {
  if (client) {
    return client;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Variável de ambiente obrigatória ausente: DATABASE_URL');
  }

  client = neon(connectionString);
  return client;
}

