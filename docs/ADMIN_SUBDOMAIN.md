# Console administrativo separado

O Majurh agora tem dois projetos Next.js no mesmo repositório:

- `maju/`: produto operacional, usado por recrutadores e gestores;
- `maju/admin-portal/`: console privado de administração, publicado como um projeto Vercel separado.

O console administrativo é responsável por criar e administrar acessos gerais, consultar o Google Analytics 4 e configurar o estado público do produto. Ele usa uma sessão própria, independente do login do Majurh, e o mesmo Neon Postgres do produto principal. O acesso é global e independente de organização: somente as contas registradas em `public.site_admins` podem abrir o console.

## Publicação na Vercel

Crie um segundo projeto Vercel apontando para o mesmo repositório e defina:

```text
Root Directory: admin-portal
Framework Preset: Next.js
Build Command: npm run build
Install Command: npm install
```

Associe o domínio `admin.seu-dominio.com` ao projeto administrativo. No projeto principal, configure:

```env
NEXT_PUBLIC_ADMIN_APP_URL=https://admin.seu-dominio.com
```

O caminho legado `https://majurh.vercel.app/admin` não renderiza mais o console. Ele redireciona para o domínio administrativo quando `NEXT_PUBLIC_ADMIN_APP_URL` estiver configurado.

## Variáveis do projeto admin-portal

Use os mesmos valores de Neon do app principal:

```env
NEON_AUTH_BASE_URL=...
NEON_AUTH_COOKIE_SECRET=...
DATABASE_URL=...
```

Também configure:

```env
NEXT_PUBLIC_MAJURH_APP_URL=https://majurh.vercel.app
GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON={...}
```

`GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON` é um segredo server-side. A conta de serviço precisa ter acesso de leitor à propriedade GA4. Ela nunca é exposta ao navegador nem salva no banco.

## Migração compartilhada

Antes de salvar as configurações do site, execute `neon/migrations/0014_admin_site_settings.sql` no banco Neon compartilhado. A tela informa `Migração pendente` e continua permitindo a leitura do restante do console até essa etapa ser concluída.

Essa migração cria apenas `public.admin_site_settings`, com modo de manutenção, URL pública e IDs da propriedade GA4. O JSON da conta de serviço permanece na configuração do projeto administrativo.

## Fluxo de acesso

1. A pessoa abre o domínio administrativo e entra com as credenciais próprias do console.
2. O portal verifica a conta na tabela global `public.site_admins`.
3. Apenas administradores globais conseguem abrir o console; não é necessário vínculo em `organization_members`.
4. O administrador cria um acesso geral com nome, e-mail e senha temporária.
5. O acesso é registrado em `public.site_access_users` e não recebe vínculo automático com organização.
6. A pessoa entra no produto principal e cria a própria organização, tornando-se administradora desse espaço.

O cadastro público continua desativado. O administrador pode trocar a senha, revogar ou reativar um acesso geral. A revogação marca o acesso como inativo e bloqueia o uso do produto, preservando a conta do Neon Auth.

### Primeiro administrador global

Execute `neon/migrations/0015_site_admins.sql`, `0016_separate_admin_auth.sql` e `0017_global_site_access.sql` no banco compartilhado. Depois, defina o hash da senha própria do console na linha correspondente de `public.site_admins`. A conta administradora pode existir sem qualquer registro em `organization_members`; o console usa o escopo global para os acessos e métricas.
