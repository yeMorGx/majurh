# Negative Prompt — Como Evitar a "Cara de IA" em Design de Sites

> Cole este documento (ou trechos dele) no início de qualquer prompt de criação/redesign de site, landing page ou produto digital. O objetivo é forçar decisões de design específicas para o projeto, em vez dos defaults estatísticos que toda IA generativa tende a repetir.

---

## 1. Paletas e cores — NÃO fazer

- **Não usar** fundo creme/off-white (próximo de `#F4F1EA`) combinado com tipografia serifada de alto contraste e acento terracota/argila (próximo de `#D97757`). Essa combinação é hoje o clichê nº1 de design gerado por IA.
- **Não usar** fundo quase-preto (`#0A0A0A` a `#111111`) com um único acento vibrante (verde-ácido, vermelho-vermelhão ou roxo neon) como "assinatura visual" padrão.
- **Não usar** gradientes roxo→azul ou roxo→rosa em botões, heróis ou backgrounds "porque parece moderno". Gradiente só se houver uma razão ligada ao conteúdo (ex: representar um espectro, um degradê real do produto).
- **Não escolher** a paleta antes de entender o assunto. A cor tem que vir de algo do mundo real do produto (materiais, ambiente, público, concorrência direta), não de uma paleta genérica de "SaaS moderno".
- **Não usar** paletas monocromáticas de cinza-azulado (`#1E293B`, `#334155`, `#64748B`...) só porque "parece profissional" — isso é o piloto automático de qualquer design system genérico.

**Fazer no lugar:** definir de 4 a 6 cores nomeadas em hex, justificadas por uma frase cada, derivadas do assunto específico do projeto.

---

## 2. Tipografia — NÃO fazer

- **Não usar** Inter, Roboto, ou qualquer fonte "seguridão corporativa" em tudo (títulos, corpo, botões) só por ser confiável e neutra.
- **Não usar** a mesma dupla de fontes (uma serifada de exibição + uma sans neutra de corpo) em todo projeto, independente do assunto — isso também virou clichê.
- **Não tratar** a tipografia como "vasilha neutra" para o conteúdo. Ela precisa carregar personalidade.
- **Não deixar** de definir uma escala tipográfica clara (tamanhos, pesos, espaçamentos) — texto solto sem hierarquia intencional é sinal de pressa, não de simplicidade.

**Fazer no lugar:** escolher um par de fontes (display + corpo, e opcionalmente uma utilitária para dados/legendas) que seja específico para esse brief, não o par "seguro" de sempre.

---

## 3. Estrutura de página — NÃO fazer

- **Não seguir** automaticamente a sequência-padrão: `Hero → 3 Feature Cards → Testimonials → Pricing → CTA final`. Essa é a "receita de bolo" que qualquer IA replica sem pensar.
- **Não usar** grids de exatamente 3 cards (ícone + título + parágrafo curto) como resposta automática para "recursos" ou "benefícios".
- **Não usar** numeração decorativa (`01 / 02 / 03`) a menos que o conteúdo seja, de fato, uma sequência real (processo, linha do tempo, passos ordenados). Se a ordem dos itens pudesse ser trocada sem perda de sentido, a numeração é decoração vazia — remova.
- **Não usar** divisores, "eyebrows" (textinhos pequenos acima do título) e labels só como enfeite. Cada elemento estrutural deve **codificar informação real**, não decorar.
- **Não copiar** a estrutura de um concorrente ou de um template só porque "é o que todo mundo faz".

**Fazer no lugar:** a estrutura deve decorrer do conteúdo real e da tarefa que a página precisa cumprir — não de um modelo mental fixo.

---

## 4. Componentes visuais — NÃO fazer

- **Não usar** glassmorphism (fundo desfocado, transparências, bordas translúcidas) sem uma razão funcional clara — hoje é usado quase sempre só como enfeite genérico de "modernidade".
- **Não usar** ícones genéricos de bibliotecas populares (Lucide, Heroicons, Feather) espalhados pela página inteira sem nenhum tratamento visual próprio — isso faz o site parecer um "template com props trocadas".
- **Não usar** border-radius idêntico em tudo (cards, botões, inputs, imagens) sem pensar se aquele grau de suavidade faz sentido para a marca.
- **Não usar** sombras (`box-shadow`) suaves e idênticas em todo componente por padrão — sombra também é decisão de design, não reflexo automático.
- **Não usar** ilustrações 3D genéricas tipo "blob roxo flutuando" ou personagens isométricos clichê como hero image.

**Fazer no lugar:** cada elemento visual precisa justificar sua existência a partir do assunto do site. Se um componente poderia estar em qualquer outro site sem alteração, ele está genérico demais.

---

## 5. Motion e interação — NÃO fazer

- **Não aplicar** fade-in-on-scroll em todos os elementos da página indiscriminadamente. Excesso de animação é hoje um dos sinais mais fortes de "isso foi gerado por IA".
- **Não usar** hover effects idênticos (leve escala + sombra) em todos os botões e cards sem pensar no motion como parte da identidade.
- **Não empilhar** vários efeitos ao mesmo tempo (parallax + fade + scale + blur) "para impressionar" — isso cansa e denuncia falta de intenção.
- **Não ignorar** `prefers-reduced-motion` — acessibilidade básica que design "genérico" costuma esquecer.

**Fazer no lugar:** escolher **um** momento de motion que sirva à identidade do produto (um load sequence, um reveal específico, uma micro-interação de assinatura) e manter o resto quieto e disciplinado.

---

## 6. Copy / redação — NÃO fazer

- **Não usar** headlines do tipo "Transforme sua [coisa] com o poder da Inteligência Artificial", "Revolucione seu [X]", "O futuro de [Y] chegou".
- **Não usar** frases picadas de efeito tipo "Rápido. Simples. Poderoso." — três palavras soltas separadas por ponto final é reflexo automático, não estilo.
- **Não usar** bullets vagos e intercambiáveis: "Fácil de usar", "100% seguro", "Escalável", "Feito para você" — frases que servem para qualquer produto não dizem nada sobre este produto.
- **Não usar** CTAs genéricos sem contexto: "Comece agora", "Saiba mais", "Get Started" sem deixar claro o que realmente acontece ao clicar.
- **Não escrever** do ponto de vista do sistema ("Webhook configurado com sucesso") quando deveria ser do ponto de vista de quem usa ("Notificações ativadas").
- **Não usar** voz passiva ou vaga em erros e estados vazios ("Algo deu errado", "Nenhum dado encontrado") sem explicar o quê e como resolver.

**Fazer no lugar:** copy específica, concreta, escrita do ponto de vista de quem usa o produto — nomeando o que a pessoa controla e reconhece, não como o sistema foi construído por dentro. Um botão que diz "Publicar" deve gerar um toast que diz "Publicado" — mesmo verbo do início ao fim do fluxo.

---

## 7. Layout e composição — NÃO fazer

- **Não centralizar** tudo por padrão (título centralizado, subtítulo centralizado, botão centralizado) só porque parece "limpo" — isso também é piloto automático.
- **Não usar** o mesmo espaçamento vertical entre todas as seções sem variar ritmo conforme a importância do conteúdo.
- **Não empilhar** seções sem transição ou hierarquia visual clara entre elas (tudo com o mesmo peso visual = tudo parece "preenchimento").
- **Não usar** contêineres com `max-width` idêntico em toda a página, ignorando que diferentes conteúdos pedem diferentes larguras de leitura.

**Fazer no lugar:** tratar o espaço em branco, o ritmo vertical e a largura de leitura como decisões de design tão intencionais quanto a cor.

---

## 8. Checklist final — perguntas para fazer antes de aceitar o design

1. Se eu tirasse o nome da marca/produto, esse design poderia ser de qualquer outra empresa do mesmo setor? Se sim, está genérico.
2. Cada elemento estrutural (numeração, ícone, divisor) está codificando uma informação real, ou é só decoração?
3. A paleta e a tipografia foram escolhidas *para este* projeto, ou são a resposta "segura" que eu daria para qualquer briefing parecido?
4. Existe um único elemento de assinatura memorável, ou a "ousadia" está espalhada (e por isso diluída) por toda a página?
5. A copy fala como o sistema foi construído, ou fala como a pessoa que usa o produto pensa e age?
6. Se eu cortar toda a animação, o design ainda funciona e comunica bem? (Se a resposta for não, a animação está fazendo trabalho que o design deveria fazer sozinho.)

---

### Resumo em uma frase

> Prefira uma escolha de design que você consiga justificar com uma frase específica sobre *este* produto, em vez de uma escolha que você faria automaticamente para qualquer produto parecido.
