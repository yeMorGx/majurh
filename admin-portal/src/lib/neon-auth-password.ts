import { randomBytes, scrypt as nodeScrypt } from 'node:crypto';

const SCRYPT_OPTIONS = {
  N: 16_384,
  r: 16,
  p: 1,
  maxmem: 128 * 16_384 * 16 * 2,
};

/** Mantém o formato usado pelo Better Auth/Neon Auth: salt hexadecimal + chave scrypt. */
export async function hashNeonAuthPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await deriveKey(password.normalize('NFKC'), salt);
  return `${salt}:${key.toString('hex')}`;
}

function deriveKey(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(password, salt, 64, SCRYPT_OPTIONS, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}
