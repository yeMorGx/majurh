-- White-label B2B: identidade visual opcional por organização.
-- Valores nulos usam a identidade padrão da plataforma Majurh.

alter table public.organizations
  add column if not exists brand_logo_url text,
  add column if not exists brand_primary_color text,
  add column if not exists brand_accent_color text;
