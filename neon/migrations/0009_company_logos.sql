-- Logos de empresas contratantes armazenadas como arquivos privados no Vercel Blob.

alter table public.companies
  add column if not exists logo_path text;
