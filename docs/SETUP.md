# Configuração do Vieira Couto RH

## Pré-requisitos

- Node.js 22 ou superior.
- Projeto Neon conectado ao projeto Vercel `majurh`.
- Neon Auth habilitado no recurso do projeto.
- Blob Store privado da Vercel conectado ao mesmo projeto para documentos.

## Variáveis locais

Copie `.env.example` para `.env.local` e preencha os valores fornecidos pela integração Neon/Vercel:

```env
DATABASE_URL=
NEON_AUTH_BASE_URL=
NEON_AUTH_COOKIE_SECRET=
BLOB_READ_WRITE_TOKEN=
```

O `NEON_AUTH_COOKIE_SECRET` deve ter pelo menos 32 caracteres e ser o mesmo em cada ambiente. Nunca publique `DATABASE_URL`, `NEON_AUTH_COOKIE_SECRET` ou `BLOB_READ_WRITE_TOKEN` no navegador, no Git ou em variáveis `NEXT_PUBLIC_`.

## Banco Neon

A migração inicial está em `neon/migrations/0001_initial_schema.sql`. Execute o arquivo uma única vez no SQL Editor do Neon ou com uma ferramenta de migração conectada ao `DATABASE_URL`.

Ela cria:

- organizações, perfis e membros;
- vagas, candidatos, processos e histórico;
- documentos e índices de busca;
- gatilhos de atualização e normalização de CPF.

As consultas são executadas exclusivamente no servidor e cada rota valida o vínculo do usuário com a organização antes de ler ou alterar dados.

## Neon Auth

O `proxy.ts` usa o middleware do Neon Auth e as chamadas de login/logout passam pelo endpoint interno `/api/auth/[...path]`. O login visual continua customizado para manter o design do Vieira Couto RH.

Para uma conta migrada, crie o usuário no Neon Auth usando o mesmo e-mail do backup. A tabela `legacy_auth_users` faz a ponte por e-mail e preserva o acesso à organização migrada, mesmo que o Neon Auth gere um novo ID. Os hashes de senha do Supabase não são copiados, pois o Neon Auth usa outro formato; a senha deve ser criada novamente pelo fluxo de cadastro ou recuperação do provedor.

## Blob privado

Documentos sensíveis usam Blob privado da Vercel. A aplicação grava apenas o pathname no Postgres e entrega o arquivo por `/api/documents/[id]/file`, validando a sessão e o vínculo organizacional em cada requisição.

## Executar a aplicação

```bash
npm install
npm run typecheck
npm run dev
```

Abra `http://127.0.0.1:3000/login`.

## Deploy na Vercel

No projeto da Vercel, abra **Settings → Environment Variables** e cadastre estas duas variáveis para o ambiente **Production** (e também **Preview**, se necessário):

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-chave-publishable
```

Depois de salvar, faça um novo deploy. Não use `service_role` ou outra chave secreta em uma variável `NEXT_PUBLIC_`.

Sem essas variáveis, `/api/health` retorna `503` e as rotas internas redirecionam para o login com uma mensagem de configuração, em vez de exibir um erro interno genérico.

## Fluxo de demonstração

1. Entrar com um usuário do Neon Auth.
2. Completar o perfil e criar a organização.
3. Cadastrar um candidato.
4. Abrir o perfil e criar um processo.
5. Alterar o status e conferir o histórico.
6. Enviar um currículo ou documento de teste.
7. Revisar o documento e voltar ao dashboard.

## Migração legada

Os arquivos em `supabase/` foram mantidos como referência histórica nesta etapa. Eles não são importados pela aplicação e os pacotes Supabase foram removidos do runtime. Só remova as migrações legadas depois de confirmar que nenhum dado precisa ser exportado do projeto antigo.

O backup de 09/09/2026 foi importado seletivamente no Neon: 1 organização, 3 perfis, 1 membro, 3 vagas, 1 candidato, 1 processo, 1 histórico e 1 documento. O PDF foi enviado para o Blob privado `vieira-couto-rh-documents`, e `candidate_documents.storage_path` aponta para o novo pathname. Os schemas internos `auth`, `storage` e `realtime` do Supabase não foram restaurados.
