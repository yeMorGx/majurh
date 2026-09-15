# Design QA — nova tela de login

## Evidências

- source visual truth path: `C:\Users\Gabriel Morgado\Downloads\Login.png`
- implementation screenshot path: `C:\Users\GABRIE~1\AppData\Local\Temp\majurh-login-qa\login-desktop-after-mobile.png`
- comparação combinada: `C:\Users\GABRIE~1\AppData\Local\Temp\majurh-login-qa\design-qa-comparison-final.png` (mockup à esquerda, implementação à direita)
- viewport CSS: `1920 × 1080`
- dimensões do source: `1920 × 1080 px`
- dimensões da implementação: `1920 × 1080 px`
- densidade: `deviceScaleFactor 1`, sem normalização adicional
- estado: `/login`, sem organização na query string, formulário vazio, viewport desktop

## Comparação

Na comparação combinada, a divisão do painel (`39,58% / 60,42%`), o recorte da arte, a marca, o tagline, a geometria dos campos, o botão e os quatro quadrados inferiores coincidem visualmente com o mockup. A implementação mantém os campos como inputs reais e adiciona ícones funcionais aos círculos; o segundo círculo alterna mostrar/ocultar senha. Essa é uma diferença intencional de acessibilidade e operação, não uma troca da composição.

### Superfícies de fidelidade

- Fontes e tipografia: wordmark, tagline e ação usam serif itálica local como fallback estável; a hierarquia e as proporções foram ajustadas ao mockup.
- Espaçamento e layout: marca inicia no mesmo eixo vertical; campos e botão foram alinhados nos mesmos y-points do source; o painel lateral ocupa o restante da largura.
- Cores e tokens: fundo claro, contorno escuro e botão preto seguem o source; overrides de organização continuam aplicáveis por tokens.
- Imagem e assets: dog mark, arte da direita e quadrados vêm de arquivos; não há desenho CSS substituindo os elementos visuais do mockup.
- Copy e conteúdo: `MajurhRH`, “Seu controle de contratação” e “Entrar” seguem o source no fallback; nome e textos do tenant continuam customizáveis.

## Findings

Não há findings P0, P1 ou P2 acionáveis após a iteração final. A diferença P3 aceita é a presença de ícones nos círculos dos campos para tornar os controles compreensíveis e utilizáveis.

## Histórico de comparação

1. Primeira captura: o fluxo ainda exibia heading/labels no painel e não reproduzia os círculos, o wordmark e os quadrados do mockup. Ajuste: composição foi reduzida ao logo, tagline, duas linhas de input, ação e asset dos quadrados.
2. Segunda captura: a estrutura ficou alinhada, mas o wordmark/tagline e o botão tinham escala diferente. Ajuste: proporções tipográficas e deslocamentos verticais foram refinados.
3. Captura final: os elementos decorativos foram incorporados como asset derivado do mockup e os y-points dos campos, botão e quadrados foram nivelados. Evidência: comparação combinada final acima.
4. Smoke responsivo: abaixo de 860px a arte lateral é removida e o formulário passa a usar toda a largura disponível; não existe mockup mobile separado para uma comparação de fidelidade.

## Interações e validações

- Rota `/login` respondeu `200` no servidor local de produção.
- Inputs mantêm `required`, `autoComplete`, labels acessíveis e submit do Neon Auth.
- O controle de senha alterna entre `password` e `text` no componente.
- `npm run typecheck`: passou.
- `npm run build`: passou; 14 páginas estáticas geradas e APIs compiladas.
- Captura visual Chromium: concluída em `1920 × 1080`.
- Smoke responsivo: regras mobile revisadas e buildada; a captura headless mobile não foi usada como evidência visual porque o Chromium retornou um frame branco antes da pintura, sem uma referência mobile equivalente.
- O navegador interno do Codex bloqueou loopback com `ERR_BLOCKED_BY_CLIENT`; por isso a captura foi feita com Chromium local. Não foi observado erro da aplicação no carregamento; a única mensagem adicional foi uma tentativa externa do Chromium de instalar o web app do Gmail.

## Checklist

- [x] Referência e implementação comparadas no mesmo viewport.
- [x] Assets fornecidos reutilizados como arquivos.
- [x] Login continua funcional e sem criação pública de conta.
- [x] White-label por organização preservado.
- [x] Responsividade mobile mantida ocultando a arte lateral em telas estreitas.

final result: passed
