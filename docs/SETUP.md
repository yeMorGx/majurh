# Configuração do Vieira Couto RH

## Pré-requisitos

- Node.js 22 ou superior.
- Um projeto Supabase local ou hospedado.
- Um usuário criado no Supabase Auth.

## Variáveis locais

Copie `.env.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Nunca use `service_role` no navegador ou em variáveis `NEXT_PUBLIC_`.

## Banco local

Com a CLI do Supabase instalada, os comandos usuais são:

```bash
supabase start
supabase db reset
supabase db lint --local --fail-on error
supabase test db
```

O reset aplica a migração inicial e o `supabase/seed.sql`, que cria uma organização e três vagas neutras para desenvolvimento. Usuários, perfis e membros não são criados automaticamente porque dependem da identidade do Auth.

Validação local já executada: lint sem erros e 24/24 testes SQL aprovados. Os testes cobrem schema, bucket privado, RLS por organização e permissões de admin/viewer.

## Primeiro acesso local

1. Inicie os serviços locais e crie um usuário pelo Auth/Studio do Supabase.
2. Confirme o UUID desse usuário em `auth.users`.
3. No SQL Editor local, associe a pessoa à organização seed:

```sql
insert into public.profiles (id, full_name)
select id, 'Dora RH'
from auth.users
where email = 'seu-email@exemplo.com'
on conflict (id) do update set full_name = excluded.full_name;

insert into public.organization_members (organization_id, user_id, role)
select organization.id, auth_user.id, 'admin'::public.app_role
from public.organizations organization
cross join auth.users auth_user
where organization.slug = 'vieira-couto-demo'
  and auth_user.email = 'seu-email@exemplo.com'
on conflict (organization_id, user_id) do update set role = excluded.role;
```

## Executar a aplicação

```bash
npm install
npm run dev
```

Abra `http://127.0.0.1:3000/login`. As rotas internas renovam a sessão via `proxy.ts` e as consultas usam o cliente SSR do Supabase.

## Deploy na Vercel

No projeto da Vercel, abra **Settings → Environment Variables** e cadastre estas duas variáveis para o ambiente **Production** (e também **Preview**, se necessário):

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-chave-publishable
```

Depois de salvar, faça um novo deploy. Não use `service_role` ou outra chave secreta em uma variável `NEXT_PUBLIC_`.

Sem essas variáveis, `/api/health` retorna `503` e as rotas internas redirecionam para o login com uma mensagem de configuração, em vez de exibir um erro interno genérico.

## Fluxo de demonstração

1. Entrar com o usuário associado à organização.
2. Cadastrar um candidato.
3. Abrir o perfil e criar um processo.
4. Alterar o status e conferir o histórico.
5. Enviar um currículo ou documento de teste.
6. Revisar o documento e voltar ao dashboard para ver a pendência atualizada.
