# Configuração do Majurh

## Pré-requisitos

- Node.js 22 ou superior.
- Projeto Neon conectado ao projeto Vercel `majurh`.
- Neon Auth habilitado no recurso do projeto.
- Blob Store privado da Vercel conectado ao mesmo projeto para documentos.

## White-label B2B

Majurh é a marca principal da plataforma. Administradores podem abrir **Organização** para definir o nome exibido, enviar um arquivo de logo, escolher as cores principal/de destaque e enviar o banner da tela de login. Também é possível editar o texto de apoio, título e descrição. O nome e a logo atualizam o título da aba e o favicon após o carregamento do tenant. Os arquivos aceitos são PNG, JPG, WEBP ou SVG, com até 5 MB. A tela pública usa a identidade quando aberta como `/login?org=slug`.

A composição padrão da tela usa os assets `public/brand/majurh-dog-mark.svg` e `public/brand/majurh-login-art.png`, com paleta vinho, vermelho queimado, coral, creme e dourado inspirada na arte. Os campos permanecem inputs reais com labels e placeholders orientativos; o controle circular da senha alterna sua visibilidade. Abaixo do acesso há quatro botões com logos locais de Google, Microsoft, Sólides e LinkedIn, atualmente desativados até os respectivos fluxos de autenticação serem implementados. A organização pode substituir logo e banner somente por upload de arquivo, sem URL de imagem editável.

Alterações de nome, cores, textos, logo e banner são propagadas imediatamente para outras abas por `BroadcastChannel`. Em outros dispositivos ou sessões, o shell autenticado, a página de organização e a tela de login consultam o estado publicado no Neon a cada cinco segundos; a mudança aparece sem recarregar a página.

O ambiente autenticado segue Material Design 3 como sistema de composição: navigation drawer lateral com seleção tonal, top app bar com busca, superfícies em camadas, contornos semânticos, botões por nível de ênfase, campos com foco visível e estados de loading/empty/error/success/disabled. A identidade Majurh permanece nos papéis de cor e na trilha de processo; não é uma cópia literal da paleta do Material.

A página **Organização** usa a mesma base como um brand studio: o hero apresenta o tenant, o formulário é dividido em identidade, papéis de cor e experiência de entrada, e a coluna lateral mostra uma prévia de login com janela, status ao vivo e confirmação da publicação. A alteração de logo e banner continua limitada a upload de arquivo, nunca URL.

As logos dos métodos alternativos da tela usam Three.js em canvases transparentes isolados. No hover, cada marca faz uma rotação 3D curta no eixo Y e retorna centralizada; a logo principal permanece como SVG normal e os cards não se movimentam. O componente usa cada SVG local como textura, mantém um fallback enquanto carrega e respeita `prefers-reduced-motion`.

Durante o preenchimento, o e-mail sugere domínios comuns localmente e indica quando o formato está reconhecido. A senha exibe força progressiva com barras e pontos ao redor do controle circular, e o olho alterna entre mostrar e ocultar com microanimação. No submit, o formulário é substituído temporariamente pelo cachorro da marca em estado de carregamento; o cachorro pisca enquanto a autenticação aguarda resposta. Esse feedback não valida se o endereço existe e não envia sugestões para serviços externos.

A migração `neon/migrations/0002_white_label_branding.sql` adiciona os campos básicos de identidade à tabela `public.organizations`. A migração `neon/migrations/0003_admin_invitations_and_login_branding.sql` adiciona os campos de texto da tela de login, o e-mail dos membros e a tabela de convites. A migração `neon/migrations/0004_brand_assets_as_files.sql` adiciona os pathnames dos arquivos de logo e banner. A migração `neon/migrations/0005_integrations_foundation.sql` prepara o cadastro seguro das integrações. A migração `neon/migrations/0007_unique_member_email.sql` normaliza e-mails, e a `neon/migrations/0008_strict_member_email_guard.sql` bloqueia novos vínculos duplicados com lock transacional. A migração `neon/migrations/0009_company_logos.sql` adiciona o pathname privado da logo de cada empresa. O índice único definitivo em `organization_members.email` será criado depois da limpeza do vínculo histórico duplicado já identificado. As migrações `0002` a `0008` já foram aplicadas no banco Neon; aplique também a `0009` antes de usar o upload de logos e configure `INTEGRATIONS_ENCRYPTION_KEY` antes de salvar credenciais de provedores.

A migração `neon/migrations/0006_companies_vacancies_identity.sql` cria o cadastro de empresas contratantes, adiciona quantidade e empresa às vagas e inclui a escolha RG/CIN na ficha do candidato. Execute-a no branch principal antes de usar `/empresas`, `/vagas` ou o escaneamento de documentos.

## Variáveis locais

Copie `.env.example` para `.env.local` e preencha os valores fornecidos pela integração Neon/Vercel:

```env
DATABASE_URL=
# Alternativa aceita quando a integração da Vercel cria este nome.
# POSTGRES_URL=
NEON_AUTH_BASE_URL=
NEON_AUTH_COOKIE_SECRET=
BLOB_READ_WRITE_TOKEN=
# Chave base64url de 32 bytes, somente no servidor, para credenciais de integrações.
INTEGRATIONS_ENCRYPTION_KEY=
```

O `NEON_AUTH_COOKIE_SECRET` deve ter pelo menos 32 caracteres e ser o mesmo em cada ambiente. Nunca publique `DATABASE_URL`, `NEON_AUTH_COOKIE_SECRET` ou `BLOB_READ_WRITE_TOKEN` no navegador, no Git ou em variáveis `NEXT_PUBLIC_`.

## Integrações de recrutamento

A base de integrações fica na migração `neon/migrations/0005_integrations_foundation.sql`. Ela cria um registro por provedor e organização, guarda somente credenciais criptografadas e nunca devolve segredos pela API. A aplicação usa `INTEGRATIONS_ENCRYPTION_KEY` para a criptografia; gere uma chave aleatória de 32 bytes em base64url e configure a mesma variável nos ambientes da Vercel.

Os provedores planejados são Catho, Sólides, LinkedIn e Indeed. Catho possui API de vagas para empresas; a Sólides fornece uma API REST autenticada por token de integração; LinkedIn Talent Solutions e Indeed exigem aprovação/parceria para os fluxos de ATS, publicação e candidaturas. Não usar scraping ou login automatizado nessas plataformas.

Um e-mail só pode pertencer a uma organização. Convites, criação administrativa de usuários, aceite de convite e criação de organização verificam esse vínculo globalmente. O Neon Auth é a fonte de verdade da conta e rejeita uma segunda conta com o mesmo e-mail; o catálogo `legacy_auth_users` também possui unicidade case-insensitive para manter a ponte de dados migrados.

## Banco Neon

A migração inicial está em `neon/migrations/0001_initial_schema.sql`. Execute o arquivo uma única vez no SQL Editor do Neon ou com uma ferramenta de migração conectada ao `DATABASE_URL`.

Ela cria:

- organizações, perfis e membros;
- vagas, candidatos, processos e histórico;
- documentos e índices de busca;
- gatilhos de atualização e normalização de CPF.

As consultas são executadas exclusivamente no servidor e cada rota valida o vínculo do usuário com a organização antes de ler ou alterar dados.

### Empresas, vagas e documentos de identidade

`/empresas` é o cadastro de apoio da organização. A empresa pode receber uma logo por upload de arquivo PNG, JPG, WEBP ou SVG de até 5 MB; a imagem é armazenada no Blob privado e pode ser adicionada ou trocada diretamente na listagem. A empresa pode ser ativada ou inativada e depois selecionada em `/vagas`. Cada vaga registra o cargo, a empresa contratante, a unidade, o departamento e a quantidade de posições abertas; essa quantidade também aparece ao iniciar um processo seletivo.

No cadastro de candidato, o tipo de identidade pode ser RG ou CIN. O componente de escaneamento aceita uma imagem local ou a câmera do dispositivo, executa OCR no navegador para sugerir nome, CPF, número de identidade e nascimento e só envia o arquivo para o bucket privado quando o cadastro é salvo. A leitura é uma sugestão: o RH deve revisar os campos antes de confirmar.

## Neon Auth

O `proxy.ts` usa o middleware do Neon Auth e as chamadas de login/logout passam pelo endpoint interno `/api/auth/[...path]`. O login visual continua customizado para manter o design do Majurh e recebe a identidade do tenant pelo parâmetro seguro `org` ou pelos links gerados na área de organização.

Para uma conta migrada, crie o usuário no Neon Auth usando o mesmo e-mail do backup. A tabela `legacy_auth_users` faz a ponte por e-mail e preserva o acesso à organização migrada, mesmo que o Neon Auth gere um novo ID. Os hashes de senha do Supabase não são copiados, pois o Neon Auth usa outro formato; a senha deve ser criada novamente pelo administrador ou pela recuperação do provedor. O cadastro público foi desativado: novos acessos devem ser criados pela conta administradora no console isolado **`/admin`** (em produção, no subdomínio administrativo). O fluxo por convite continua disponível em **Administração** para organizações que optarem por convidar a pessoa a concluir o próprio cadastro.

O detalhamento do console, do vínculo Neon Auth/Postgres e da configuração do subdomínio está em [`docs/ADMIN_SUBDOMAIN.md`](./ADMIN_SUBDOMAIN.md).

### Primeiro acesso sem organização

Uma conta autenticada sem perfil conclui primeiro o nome do próprio perfil. Em seguida, se ainda não tiver vínculo, o Majurh apresenta **Criar organização**. O nome informado gera um slug disponível, cria a organização no Neon Postgres e registra automaticamente o usuário como `admin`. A partir daí, a pessoa entra no dashboard e pode configurar o white-label ou criar os demais acessos no console administrativo.

Se a pessoa já tiver sido convidada para uma organização, o convite continua prevalecendo: o vínculo é criado pelo fluxo de `/convite/[token]` e ela não precisa criar uma nova organização.

### Convites e primeiro acesso

1. Um administrador abre `/administracao` e informa o e-mail e o papel (`Recrutador` ou `Visualizador`).
2. A aplicação cria um token aleatório, grava somente seu hash e mostra o link copiável por sete dias.
3. A pessoa abre `/convite/[token]`, define o nome e a senha — ou entra se já possuir uma conta.
4. Depois da autenticação, a aplicação marca o convite como utilizado, cria o perfil e registra `organization_members`.

O fluxo não envia e-mail automaticamente nesta etapa. O administrador deve compartilhar o link por um canal corporativo confiável. Um usuário autenticado sem associação não pode criar organização nem concluir um perfil para entrar por conta própria.

Em **Auth → Configuration → Domains** do branch principal, mantenha `https://majurh.vercel.app` como domínio confiável. O Neon Auth rejeita requisições de origens não cadastradas com `403 Invalid origin`. Links individuais de preview da Vercel podem permanecer protegidos e não devem ser usados para o cadastro de usuários.

## Blob privado

Documentos sensíveis usam Blob privado da Vercel. A aplicação aceita PDF, JPG e PNG de até 6 MB, grava apenas o pathname no Postgres e entrega o arquivo por `/api/documents/[id]/file`, validando a sessão e o vínculo organizacional em cada requisição.

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
# Se a integração Neon/Vercel usar este nome, ele também é aceito:
# POSTGRES_URL=postgresql://...
NEON_AUTH_BASE_URL=https://...neonauth.../neondb/auth
NEON_AUTH_COOKIE_SECRET=um-segredo-com-pelo-menos-32-caracteres
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

Depois de salvar, faça um novo deploy. Não use chaves secretas em variáveis `NEXT_PUBLIC_`.

Sem essas variáveis, `/api/health` retorna `503` e as rotas internas exibem uma mensagem de configuração, em vez de um erro interno genérico.

## Fluxo de demonstração

1. Entrar com o usuário administrador do Neon Auth.
2. Configurar o tenant em **Organização** e conferir a prévia da tela de login.
3. Criar um convite em **Administração** e abrir o link em uma janela anônima.
4. Cadastrar um candidato.
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
