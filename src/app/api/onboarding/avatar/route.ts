import { put } from '@vercel/blob';
import { getAuthenticatedClient } from '@/lib/api/auth';
import { databaseErrorResponse, errorJson, json } from '@/lib/api/http';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const maxAvatarSize = 5 * 1024 * 1024;
const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

export async function POST(request: NextRequest) {
  try {
    const { userId, authUserId } = await getAuthenticatedClient();
    if (!userId) return errorJson('É necessário estar autenticado.', 401);
    const file = (await request.formData()).get('file');
    if (!(file instanceof File)) return errorJson('Selecione uma foto.', 400);
    if (!allowedTypes.has(file.type)) return errorJson('Use uma foto PNG, JPG ou WEBP.', 400);
    if (file.size <= 0 || file.size > maxAvatarSize) return errorJson('A foto deve ter até 5 MB.', 400);

    const ownerId = authUserId ?? userId;
    const path = `profiles/${ownerId}/${crypto.randomUUID()}.${extensionForType(file.type)}`;
    await put(path, file, { access: 'private', contentType: file.type, addRandomSuffix: false });
    return json({ data: { path } });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

function extensionForType(type: string) {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/webp') return 'webp';
  return 'png';
}
