# Vieira Couto RH — diretrizes visuais

> Direção visual para implementar o MVP com Tailwind e shadcn/ui.

## 1. Norte visual

O mockup de referência usa uma interface de produtividade clara: uma moldura branca, shell em cinza muito suave, sidebar lateral, header com busca e ações, cards brancos e verde como cor de destaque. O Vieira Couto RH deve preservar essa sensação de ordem e leveza, mas trocar o vocabulário de “projetos e tarefas” pelo de **candidatos, processos e documentos**.

### Conceito

**Um posto de controle calmo para o fluxo de pessoas.**

A interface precisa parecer segura e operacional, não fria nem excessivamente tecnológica. O RH deve enxergar o próximo passo de cada candidato sem se perder em uma planilha densa.

### Assinatura do produto

O elemento memorável é a **trilha de processo**: uma linha curta com etapas, marcador de status e próxima ação. Para pendências, usar uma hachura diagonal discreta — inspirada nas barras hachuradas do mockup — somente em estados de espera ou documentação pendente. Essa textura não é decoração geral e não deve aparecer em todos os cards.

## 2. Paleta de design tokens

Usar os nomes semânticos abaixo no tema do Tailwind/shadcn. Os hexadecimais são a fonte de verdade visual; se o projeto usar HSL, converter sem mudar a intenção.

| Token | Hex | Uso |
|---|---:|---|
| `vc-background` | `#FFFFFF` | Fundo principal de conteúdo e cards |
| `vc-shell` | `#F4F7F5` | Sidebar, header e áreas de apoio |
| `vc-surface-subtle` | `#FAFCFB` | Campos, linhas de tabela e regiões suaves |
| `vc-border` | `#E3EAE6` | Bordas e divisórias |
| `vc-ink` | `#10231B` | Texto principal, títulos e números |
| `vc-muted` | `#71817A` | Texto secundário e metadados |
| `vc-forest` | `#0F4D3A` | Ações fortes, card hero e hover escuro |
| `vc-green` | `#138A62` | Ação primária, progresso e status positivo |
| `vc-mint` | `#DDF3E9` | Fundo de sucesso e seleção suave |
| `vc-warning` | `#B7791F` | Atenção e documentação em análise |
| `vc-warning-soft` | `#FFF3D6` | Fundo de atenção |
| `vc-danger` | `#C44949` | Reprovação, erro e desistência |
| `vc-danger-soft` | `#FCE8E8` | Fundo de erro |
| `vc-info` | `#3B6EA8` | Informações e links auxiliares |
| `vc-info-soft` | `#EAF2FB` | Fundo informativo |

Regras:

- Verde é a cor de ação e avanço, não deve pintar todos os elementos da tela.
- O vermelho representa uma condição ou risco operacional, nunca uma ação destrutiva sem confirmação.
- Status não pode depender apenas de cor: combinar texto, forma, ícone e, quando necessário, hachura.
- Não usar gradientes coloridos como fundo de página. O mockup pode ter verde profundo em um card de destaque, mas o restante deve permanecer silencioso.
- Não usar preto puro; preferir `vc-ink`.

## 3. Tipografia

Usar três funções tipográficas:

| Função | Fonte | Aplicação |
|---|---|---|
| Display e títulos | **Manrope** | Nome da página, números de destaque e títulos de cards |
| Interface e corpo | **IBM Plex Sans** | Labels, tabelas, botões, descrições e formulários |
| Dados utilitários | **IBM Plex Mono** | CPF mascarado, IDs, horários, códigos e metadados técnicos |

Carregar com `next/font` e declarar fallback sans-serif. Evitar usar a fonte mono em parágrafos ou como ornamento.

Escala inicial:

| Papel | Tamanho desktop | Peso | Entrelinha |
|---|---:|---:|---:|
| Título de página | 32 px | 650 | 1.1 |
| Título de seção | 20 px | 650 | 1.2 |
| Título de card | 16 px | 600 | 1.3 |
| Número de indicador | 32–40 px | 650 | 1 |
| Corpo | 14 px | 400 | 1.5 |
| Label | 12 px | 600 | 1.3 |
| Metadado | 12 px | 450 | 1.4 |

O texto da interface é em sentence case e PT-BR: **Adicionar candidato**, **Aguardando documentos**, **Ver histórico**. Evitar caixa alta, frases promocionais e termos técnicos voltados ao usuário final.

## 4. Layout e ritmo

### Estrutura do shell

```txt
┌─────────────────────────────────────────────────────────────┐
│ Sidebar 232 px │ Header 72 px: busca + ações + usuário      │
│                ├────────────────────────────────────────────┤
│                │ Main: título, filtros e conteúdo           │
│                │                                             │
│                │ cards / tabela / trilhas / estados         │
└─────────────────────────────────────────────────────────────┘
```

- Largura máxima de conteúdo: 1440 px; em telas largas, centralizar o shell.
- Sidebar desktop: 232 px, fundo `vc-shell`, borda direita sutil.
- Header: 72 px, fundo `vc-shell`, busca alinhada à esquerda e ações no lado direito.
- Conteúdo: fundo `vc-shell` ou branco conforme a tela; usar cards brancos para criar hierarquia.
- Padding principal: 32 px em desktop, 24 px em tablet, 16 px em mobile.
- Espaçamento de grade: 16 px entre cards; 24–32 px entre seções.
- Cards: raio de 16 px, borda de 1 px, sombra mínima. Usar sombra somente em elementos flutuantes.
- Shell externo, quando houver moldura no protótipo: raio de 24 px; em produção, respeitar o viewport e não criar uma “janela” desnecessária em telas pequenas.

### Responsividade

- Abaixo de 1100 px, reduzir a sidebar para estado recolhido com tooltip.
- Abaixo de 768 px, transformar sidebar em drawer e manter o header com busca acessível por botão.
- A tabela de candidatos deve virar cartões empilhados ou tabela com colunas prioritárias; nunca forçar rolagem horizontal para ler o nome e o status.
- Formulários devem passar de duas colunas para uma coluna.
- O CTA principal permanece visível no topo, mas não deve cobrir o conteúdo.

## 5. Componentes base

Construir com shadcn/ui e customizar os tokens, sem deixar o estilo padrão dominar a identidade.

### Navegação

- `Sidebar` com marca Vieira Couto RH, links Dashboard, Candidatos, Processos, Documentos e Configurações.
- Item ativo com fundo `vc-mint`, texto `vc-forest` e uma barra vertical verde de 3 px na borda esquerda.
- Ícones Lucide de 18 px, sempre acompanhados de texto no desktop.
- No rodapé, usuário atual e ação Sair; não usar o card de “plano” do mockup no MVP.

### Header

- Campo de busca global com placeholder **Buscar candidato por nome, CPF ou telefone**.
- Atalho de teclado pode ser exibido como uma pequena cápsula, mas não é obrigatório no MVP.
- Ações de notificações e perfil devem ser discretas, com foco visível.

### Botões

- Primário: fundo `vc-forest`, texto branco, raio 999 px, altura mínima 40 px.
- Secundário: fundo branco, borda `vc-border`, texto `vc-ink`.
- Ghost: sem borda, texto `vc-muted`; usar apenas em ações de baixa prioridade.
- Destrutivo: fundo `vc-danger` apenas quando a ação realmente remover dados; para reprovar ou marcar desistência, preferir botão secundário com confirmação contextual.
- Ícone sozinho só quando o ícone for inequívoco; adicionar tooltip e `aria-label`.

### Cards de indicador

Cada card deve ter label, número, contexto temporal e destino clicável quando houver lista relacionada.

Exemplo:

```txt
┌────────────────────────────┐
│ Aguardando documentos   ↗  │
│ 11                         │
│ 3 há mais de 3 dias        │
└────────────────────────────┘
```

Um card de destaque pode usar `vc-forest` com texto branco para **Processos ativos**. Os demais permanecem brancos para preservar contraste e ritmo.

### Status badge

Usar texto curto, fundo suave e ícone consistente:

| Status | Tratamento |
|---|---|
| Novo candidato | neutro, `vc-surface-subtle` |
| Triagem | info suave |
| Entrevista | verde suave |
| Avaliação | azul suave |
| Aprovado | mint |
| Documentação | warning suave + hachura opcional |
| Admissão | verde suave |
| Contratado | verde sólido discreto |
| Reprovado | danger suave |
| Desistiu | danger suave, sem tom de punição |
| Banco de talentos | neutro com ícone de arquivo |

O label exibido deve ser sempre legível: não usar apenas bolinhas coloridas.

## 6. Telas prioritárias

### Login

Composição dividida, porém simples:

- Lado principal branco com logo, título **Entrar no Vieira Couto RH**, campos e CTA.
- Lado auxiliar em `vc-forest`, com uma ilustração abstrata/geométrica de documentos conectados a uma trilha de processo; sem pessoas genéricas de banco de imagens.
- Em mobile, remover o painel auxiliar e manter apenas o formulário.

### Dashboard

Hierarquia recomendada:

1. Título **Bom dia, Dora** e subtítulo operacional, sem slogan.
2. Ação primária **Adicionar candidato**.
3. Quatro ou cinco indicadores.
4. Bloco maior **Processos recentes** com nome, vaga, status e última atualização.
5. **Documentos pendentes** e **Atividade recente** em colunas menores.
6. Uma trilha horizontal ou vertical mostrando a distribuição do funil, sem transformar o dashboard em painel de métricas abstratas.

Copy de exemplo:

- **11 candidatos aguardando documentos**
- **3 processos parados há mais de 3 dias**
- **Ver candidatos pendentes**
- **João Silva mudou para Documentação**

### Lista de candidatos

- Header com título, contagem e botão **Adicionar candidato**.
- Busca grande no topo e filtros em uma linha abaixo.
- Tabela/card com nome, contato mascarado, processo atual, status, última atualização e menu de ações.
- Nunca mostrar CPF completo na lista.
- Estado vazio: **Ainda não há candidatos. Cadastre o primeiro para começar o histórico.**

### Perfil do candidato

- Cabeçalho branco com nome, CPF mascarado, telefone e status atual.
- Abaixo, tabs com underline verde ou pílula mint; evitar muitos contornos.
- O componente de maior personalidade é `ProcessTimeline`: etapas passadas em verde escuro, etapa atual em verde, próxima etapa em cinza e pendências com hachura.
- Documentos devem usar lista compacta com ícone de arquivo, status, data e ação de visualizar.

### Alerta de CPF repetido

Usar um card de atenção com fundo `vc-warning-soft`, ícone de alerta e copy direta:

> Este CPF já possui histórico no sistema.

Exibir nome, número de processos e último resultado. A ação principal é **Ver histórico**; não usar modal assustador nem bloquear a busca.

### Registro de desistência

Modal ou painel lateral com título **Registrar desistência**. A ordem dos campos é motivo, observação e possibilidade de participar novamente. O botão deve dizer **Salvar desistência**, e a confirmação deve repetir o resultado salvo.

## 7. Ícones, ilustração e textura

- Lucide como biblioteca única de ícones.
- Tamanho base 18 px; 16 px em metadados e 20–24 px em ações principais.
- Não usar emoji na interface final.
- A ilustração do login deve ser abstrata e específica: folhas/documentos, pequenos marcadores e uma trilha verde; evitar aperto de mãos, pessoas sorrindo ou ícones genéricos de “equipe”.
- A hachura diagonal deve ter linhas finas em `vc-muted` com baixa opacidade e aparecer apenas em pendências, placeholders ou segmentos incompletos da trilha.
- Não combinar hachura, gradiente, glow e sombra no mesmo componente.

## 8. Movimento e estados

- Usar transições de 150–200 ms para hover, foco e abertura de menus.
- Entrada de página pode usar fade/translate de poucos pixels, uma vez; não animar cada card individual.
- Upload pode ter progresso visível; mudança de status pode destacar a nova etapa por um instante curto.
- Respeitar `prefers-reduced-motion` e remover deslocamentos para quem preferir menos movimento.
- Sempre criar estados `loading`, `empty`, `error`, `success` e `disabled` antes de considerar um componente pronto.

Mensagens:

- Sucesso: **Candidato salvo.**
- Erro específico: **Não foi possível salvar o candidato. Revise os campos destacados e tente novamente.**
- Erro de documento: **Este arquivo excede o limite de 6 MB. Escolha um arquivo menor.**
- Vazio: **Nenhum processo encontrado com esses filtros.**
- Nunca usar apenas “Algo deu errado”.

## 9. Acessibilidade

- Contraste AA para texto e controles; conferir especialmente cinza secundário em fundo branco.
- Foco visível com outline verde de pelo menos 2 px.
- Todos os inputs têm label persistente; placeholder não substitui label.
- Dialogs têm título, descrição, foco inicial e fechamento por Escape.
- Tabelas têm cabeçalho semântico; badges continuam compreensíveis sem cor.
- Áreas de drag-and-drop futuras terão alternativa por teclado; o MVP não depende de arrastar.
- Respeitar zoom de 200% e navegação somente por teclado.

## 10. Regras para o Codex

- Ler este arquivo antes de criar ou alterar páginas da interface.
- Preferir componentes pequenos e orientados ao domínio (`CandidateCard`, `ProcessTimeline`) em vez de componentes genéricos sem linguagem do produto.
- Derivar cores, espaçamentos e raios dos tokens; não adicionar hex aleatório em uma tela.
- Reutilizar a mesma nomenclatura de status em banco, TypeScript, UI e mensagens.
- Usar `StatusBadge` e `ProcessTimeline` em todas as telas para manter leitura consistente.
- Não copiar literalmente o dashboard do mockup: preservar o sistema visual, mas priorizar o fluxo candidato → processo → documentos → histórico.
- Antes de finalizar uma tela, conferir desktop, mobile, teclado, estado vazio e erro.

