# Console administrativo separado

O Majurh agora tem dois projetos Next.js no mesmo repositório:

- `maju/`: produto operacional, usado por recrutadores e gestores;
- `maju/admin-portal/`: console privado de administração, publicado como um projeto Vercel separado.

O console administrativo é responsável por criar e administrar usuários, consultar o Google Analytics 4 e configurar o estado público do produto. Ele usa Neon Auth para a sessão e o mesmo Neon Postgres do produto principal. A regra de autorização exige que a pessoa tenha papel `admin` em uma organização.

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

1. A pessoa abre o domínio administrativo e entra pelo Neon Auth.
2. O portal resolve a organização vinculada à sessão.
3. Apenas papel `admin` consegue abrir o console.
4. O administrador cria usuários com senha temporária e papel inicial.
5. A conta criada pode entrar no produto principal, mas não tem acesso ao console administrativo.

O cadastro público continua desativado. O administrador pode editar papel, trocar senha ou remover o vínculo de uma pessoa da organização. Remover não apaga a conta global do Neon Auth.
