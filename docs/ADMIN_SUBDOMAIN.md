# Console administrativo no Neon

O cadastro público continua desativado. Novos acessos devem ser criados pela conta administradora no console isolado do Majurh.

## Rotas

- Local: `http://localhost:3000/admin`
- Produção: `https://admin.seu-dominio.com`

Quando alguém abre a raiz do subdomínio, o app direciona para `/admin`. O middleware do Neon Auth protege a rota e leva pessoas não autenticadas para o login. A tela de login não possui botão de criação pública.

## Criação de usuário

`POST /api/admin/users` executa este fluxo no servidor:

1. valida a sessão Neon Auth e o papel `admin` na organização;
2. cria a conta com e-mail, nome e senha no Neon Auth;
3. cria ou atualiza o perfil em `public.profiles`;
4. grava o vínculo e o papel em `public.organization_members`;
5. remove a conta criada no Neon Auth se a gravação do vínculo falhar.

A senha temporária não é armazenada em texto no Postgres nem devolvida pelo servidor. Ela fica somente no estado da tela do administrador para ser copiada e enviada por um canal seguro.

Não é necessário criar uma nova tabela ou migração para este fluxo: `profiles` e `organization_members` já fazem parte das migrações do Neon. O papel `admin` do Majurh é independente da role interna do Neon Auth; a conta administradora precisa também ter permissão de administrador no Neon Auth para chamar o endpoint de criação.

## Configuração do domínio

Na Vercel, adicione `admin.seu-dominio.com` em **Settings → Domains** e crie o registro DNS indicado pela própria Vercel. Depois, inclua o domínio final em **Auth → Configuration → Domains** no branch principal do Neon Auth.

As variáveis continuam sendo as mesmas do app:

```env
DATABASE_URL=... # ou POSTGRES_URL=...
NEON_AUTH_BASE_URL=...
NEON_AUTH_COOKIE_SECRET=...
```

O login iniciado no subdomínio retorna para o console administrativo. Como a sessão é configurada por domínio por padrão, isso não exige compartilhar o cookie com o domínio principal. Se o produto precisar de uma sessão única entre `app.` e `admin.`, configure explicitamente um domínio de cookie no servidor, após validar essa decisão de segurança.

## Validação manual

1. Abra `/admin` autenticado como administrador.
2. Crie um usuário de teste com papel `Recrutador` ou `Visualizador`.
3. Confirme que ele aparece em **Pessoas com acesso**.
4. Em uma janela anônima, abra o domínio principal e entre com o e-mail e a senha temporária.
5. Confirme que o usuário acessa a organização, mas não consegue abrir o console administrativo.
