-- Assets do white-label são arquivos, nunca URLs digitadas pelo usuário.
-- O arquivo fica no Blob privado; o banco guarda apenas o pathname interno.

alter table public.organizations
  add column if not exists brand_logo_path text,
  add column if not exists brand_login_banner_path text;
