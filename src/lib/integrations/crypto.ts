import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const algorithm = 'aes-256-gcm';
const associatedData = Buffer.from('majurh-integrations-v1');

function getEncryptionKey() {
  const value = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!value) {
    throw new Error('Variável de ambiente obrigatória ausente: INTEGRATIONS_ENCRYPTION_KEY');
  }

  const key = Buffer.from(value, 'base64url');
  if (key.length !== 32) {
    throw new Error('INTEGRATIONS_ENCRYPTION_KEY deve ser uma chave base64url de 32 bytes');
  }

  return key;
}

export function encryptIntegrationCredentials(credentials: Record<string, string>) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, getEncryptionKey(), iv);
  cipher.setAAD(associatedData);

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(credentials), 'utf8'),
    cipher.final(),
  ]);

  return [
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

export function decryptIntegrationCredentials(value: string): Record<string, string> {
  const [ivValue, authTagValue, encryptedValue] = value.split('.');
  if (!ivValue || !authTagValue || !encryptedValue) throw new Error('Credencial de integração inválida');

  const decipher = createDecipheriv(
    algorithm,
    getEncryptionKey(),
    Buffer.from(ivValue, 'base64url'),
  );
  decipher.setAAD(associatedData);
  decipher.setAuthTag(Buffer.from(authTagValue, 'base64url'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
  const parsed: unknown = JSON.parse(plaintext);

  if (!isStringRecord(parsed)) throw new Error('Credencial de integração inválida');
  return parsed;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && Object.values(value).every((item) => typeof item === 'string');
}
