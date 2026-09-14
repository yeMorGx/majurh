# Configuração do Majurh

## Pré-requisitos

- Node.js 22 ou superior.
- Projeto Neon conectado ao projeto Vercel `majurh`.
- Neon Auth habilitado no recurso do projeto.
- Blob Store privado da Vercel conectado ao mesmo projeto para documentos.

## White-label B2B

Majurh é a marca principal da plataforma. Depois que uma organização é criada, administradores podem abrir **Configurações → Identidade da organização** para definir o nome exibido, uma logo por URL HTTPS e as cores principal/de destaque. O nome e a logo também atualizam o título da aba e o favicon após o carregamento do tenant. Os valores são opcionais: quando ficam vazios, a interface usa a identidade padrão do Majurh.

A migração `neon/migrations/0002_white_label_branding.sql` adiciona os campos de identidade à tabela `public.organizations`. Execute essa migração no banco Neon antes de usar o editor de marca em produção.

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

O `proxy.ts` usa o middleware do Neon Auth e as chamadas de login/logout passam pelo endpoint interno `/api/auth/[...path]`. O login visual continua customizado para manter o design do Majurh e pode receber a identidade do tenant em uma etapa de domínio personalizado.

Para uma conta migrada, crie o usuário no Neon Auth usando o mesmo e-mail do backup. A tabela `legacy_auth_users` faz a ponte por e-mail e preserva o acesso à organização migrada, mesmo que o Neon Auth gere um novo ID. Os hashes de senha do Supabase não são copiados, pois o Neon Auth usa outro formato; a senha deve ser criada novamente pelo fluxo de cadastro ou recuperação do provedor.

Em **Auth → Configuration → Domains** do branch principal, mantenha `https://majurh.vercel.app` como domínio confiável. O Neon Auth rejeita requisições de origens não cadastradas com `403 Invalid origin`. Links individuais de preview da Vercel podem permanecer protegidos e não devem ser usados para o cadastro de usuários.

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

No projeto da Vercel, abra **Settings → Environment Variables** e confira estas variáveis nos ambientes usados:

```env
DATABASE_URL=postgresql://...
NEON_AUTH_BASE_URL=https://...neonauth.../neondb/auth
NEON_AUTH_COOKIE_SECRET=um-segredo-com-pelo-menos-32-caracteres
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

Depois de salvar, faça um novo deploy. Não use chaves secretas em variáveis `NEXT_PUBLIC_`.

Sem essas variáveis, `/api/health` retorna `503` e as rotas internas exibem uma mensagem de configuração, em vez de um erro interno genérico.

## Fluxo de demonstração

1. Entrar com um usuário do Neon Auth.
2. Completar o perfil e criar a organização.
3. Cadastrar um candidato.
4. Abrir o perfil e criar um processo.
5. Alterar o status e conferir o histórico.
6. Enviar um currículo ou documento de teste.
7. Revisar o documento e voltar ao dashboard.

## Produtividade

O workspace também possui a área `/produtividade`, com Kanban, TO-DO, time tracker, calendário mensal e um canvas de brainstorm livre no estilo Miro. No canvas, o botão direito abre ações rápidas para criar nota, inserir imagem local de até 1,5 MB, adicionar moldura ou excluir o item selecionado. Nesta entrega, o módulo começa zerado e funciona localmente, salvando cards, tarefas, compromissos e notas no armazenamento do navegador. Isso permite testar a experiência sem criar registros compartilhados no banco.

Os botões de Google Calendar e Outlook estão visíveis como preparação de integração. Para ativá-los em produção será necessário configurar OAuth no servidor, armazenar tokens com segurança por organização e implementar sincronização incremental. Não coloque client secrets nem tokens de calendário em variáveis `NEXT_PUBLIC_` ou no navegador.

### Referência visual

As telas usam Material Design 3 como referência de fundação para tokens semânticos, estados de foco/hover, superfícies e adaptação entre tamanhos de tela. A identidade do tenant define nome, logo e cores quando configurada; Majurh permanece como fallback da plataforma.

## Migração legada

Os arquivos em `supabase/` foram mantidos como referência histórica nesta etapa. Eles não são importados pela aplicação e os pacotes Supabase foram removidos do runtime. Só remova as migrações legadas depois de confirmar que nenhum dado precisa ser exportado do projeto antigo.

O backup de 09/09/2026 foi importado seletivamente no Neon: 1 organização, 3 perfis, 1 membro, 3 vagas, 1 candidato, 1 processo, 1 histórico e 1 documento. O PDF foi enviado para o Blob privado `vieira-couto-rh-documents`, e `candidate_documents.storage_path` aponta para o novo pathname. Os schemas internos `auth`, `storage` e `realtime` do Supabase não foram restaurados.
