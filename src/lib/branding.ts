export const platformBrand = {
  name: 'Majurh',
  descriptor: 'Gestão de pessoas e operações',
  description: 'Gestão de pessoas, candidatos e processos em um só lugar.',
  logoPath: '/logo.svg',
} as const;

export type OrganizationBrand = {
  id: string;
  name: string;
  slug: string;
  brand_logo_path?: string | null;
  brand_primary_color?: string | null;
  brand_accent_color?: string | null;
  brand_login_banner_path?: string | null;
  brand_login_kicker?: string | null;
  brand_login_headline?: string | null;
  brand_login_description?: string | null;
};

const defaultColors = {
  primary: '#0f4d3a',
  accent: '#138a62',
};

export function getBrandStyle(organization?: OrganizationBrand | null): Record<string, string> {
  const primary = normalizeHex(organization?.brand_primary_color) ?? defaultColors.primary;
  const accent = normalizeHex(organization?.brand_accent_color) ?? defaultColors.accent;

  return {
    '--vc-forest': primary,
    '--vc-green': accent,
    '--vc-mint': `color-mix(in srgb, ${accent} 16%, white)`,
    '--md-sys-color-primary': primary,
    '--md-sys-color-primary-container': `color-mix(in srgb, ${primary} 14%, white)`,
    '--md-sys-color-on-primary-container': primary,
  };
}

export function normalizeHex(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.trim();
  return /^#[0-9a-f]{6}$/i.test(normalized) || /^#[0-9a-f]{3}$/i.test(normalized)
    ? normalized
    : null;
}

export function getOrganizationAssetUrl(organization: OrganizationBrand | null | undefined, kind: 'logo' | 'login-banner') {
  const hasAsset = kind === 'logo' ? organization?.brand_logo_path : organization?.brand_login_banner_path;
  return hasAsset && organization?.id
    ? `/api/branding/assets/${organization.id}/${kind}`
    : null;
}
