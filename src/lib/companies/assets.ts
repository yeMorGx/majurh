export const maxCompanyLogoSize = 5 * 1024 * 1024;

export const allowedCompanyLogoTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);

export function validateCompanyLogo(file: File) {
  if (!allowedCompanyLogoTypes.has(file.type)) return 'Use um arquivo PNG, JPG, WEBP ou SVG.';
  if (file.size <= 0 || file.size > maxCompanyLogoSize) return 'A logo deve ter entre 1 byte e 5 MB.';
  return null;
}

export function companyLogoPath(organizationId: string, companyId: string, type: string) {
  return 'organizations/' + organizationId + '/companies/' + companyId + '-' + crypto.randomUUID() + '.' + extensionForType(type);
}

function extensionForType(type: string) {
  if (type === 'image/svg+xml') return 'svg';
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/webp') return 'webp';
  return 'png';
}
