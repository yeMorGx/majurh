import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

export type DatabaseClient = NeonQueryFunction<false, false>;

let client: DatabaseClient | undefined;

export function getDatabaseConnectionString() {
  return process.env.DATABASE_URL
    || process.env.POSTGRES_URL
    || process.env.POSTGRES_PRISMA_URL
    || process.env.POSTGRES_URL_NON_POOLING;
}

export function getDatabase(): DatabaseClient {
  if (client) {
    return client;
  }

  const connectionString = getDatabaseConnectionString();
  if (!connectionString) {
    throw new Error('Variável de ambiente obrigatória ausente: DATABASE_URL ou POSTGRES_URL');
  }

  client = neon(connectionString);
  return client;
}

