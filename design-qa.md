# Design QA — nova tela de login

## Evidências

- source visual truth path: `C:\Users\Gabriel Morgado\Downloads\Login.png`
- implementation screenshot path: `C:\Users\GABRIE~1\AppData\Local\Temp\majurh-login-qa\login-desktop-compact.png`
- comparação combinada: `C:\Users\GABRIE~1\AppData\Local\Temp\majurh-login-qa\design-qa-comparison-compact.png` (mockup à esquerda, implementação à direita)
- viewport CSS: `1920 × 1080`
- dimensões do source: `1920 × 1080 px`
- dimensões da implementação: `1920 × 1080 px`
- densidade: `deviceScaleFactor 1`, sem normalização adicional
- estado: `/login`, sem organização na query string, formulário vazio, viewport desktop

## Comparação

Na comparação combinada, a divisão do painel (`39,58% / 60,42%`), o recorte da arte, a marca, o tagline, a geometria dos campos, o botão e os quatro controles inferiores mantêm a composição do mockup. A última iteração compacta o formulário para uma leitura mais leve, sem perder a hierarquia: campos de 60 px, círculos de 60 px, botão de 84 px e largura máxima de 475 px. A implementação mantém os campos como inputs reais, acrescenta labels e placeholders orientativos e usa ícones funcionais nos controles circulares; o segundo círculo alterna mostrar/ocultar senha. Os quatro controles inferiores exibem logos locais de Google, Microsoft, Sólides e LinkedIn, são semanticamente desativados e ficam reservados para futuras formas de login. Os novos feedbacks de domínio, força da senha e carregamento foram adicionados como estados auxiliares, sem alterar a composição base.

### Superfícies de fidelidade

- Fontes e tipografia: wordmark, tagline e ação usam serif itálica local como fallback estável; a hierarquia e as proporções foram ajustadas ao mockup.
- Espaçamento e layout: marca inicia no mesmo eixo vertical; campos e botão foram alinhados nos mesmos y-points do source; o painel lateral ocupa o restante da largura.
- Cores e tokens: a base saiu do verde e passou para vinho, vermelho queimado, coral, creme e dourado; overrides de organização continuam aplicáveis por tokens.
- Imagem e assets: dog mark, arte da direita e logos dos métodos vêm de arquivos locais; não há URL de imagem editável nem integração falsa.
- Copy e conteúdo: `Maju RH`, “Seu controle de contratação” e “Entrar” seguem o fallback aprovado; nome e textos do tenant continuam customizáveis.

## Findings

Não há findings P0, P1 ou P2 acionáveis após a iteração final. As diferenças P3 aceitas são os labels/placeholders para orientar o preenchimento e os ícones nos círculos dos campos para tornar os controles compreensíveis e utilizáveis. Os quatro quadrados inferiores agora são botões desativados, preservando a intenção de receber novas formas de login sem sugerir uma integração já disponível.

## Histórico de comparação

1. Primeira captura: o fluxo ainda exibia heading/labels no painel e não reproduzia os círculos, o wordmark e os quadrados do mockup. Ajuste: composição foi reduzida ao logo, tagline, duas linhas de input, ação e asset dos quadrados.
2. Segunda captura: a estrutura ficou alinhada, mas o wordmark/tagline e o botão tinham escala diferente. Ajuste: proporções tipográficas e deslocamentos verticais foram refinados.
3. Captura final: os elementos decorativos foram incorporados como asset derivado do mockup e os y-points dos campos, botão e controles inferiores foram nivelados.
4. Iteração anterior: o wordmark foi corrigido para `Maju RH`, os campos receberam labels/placeholders e os quadrados foram convertidos em botões desativados para futuras formas de login.
5. Iteração anterior: campos, círculos, botão e espaçamentos foram compactados; a largura mobile foi limitada com `calc(100vw - 40px)` para impedir corte horizontal.
6. Iteração atual: a paleta global foi trocada para vinho/coral, os quatro controles inferiores passaram a exibir logos locais e cada logo de método recebeu rotação 3D suave no hover via Three.js; a logo principal permanece estática.
7. Iteração atual: o e-mail ganhou sugestões locais de domínio e badge de formato reconhecido; a senha ganhou força progressiva, pontos orbitais e microanimação do olho; o submit agora troca a tela pelo cachorro em loading com piscar suave.
8. Smoke responsivo: abaixo de 860px a arte lateral é removida e o formulário passa a usar toda a largura disponível; não existe mockup mobile separado para uma comparação de fidelidade.

## Interações e validações

- Rota `/login` respondeu `200` no servidor local de produção.
- Inputs mantêm `required`, `autoComplete`, labels acessíveis, placeholders orientativos e submit do Neon Auth.
- O controle de senha alterna entre `password` e `text` no componente.
- Os quatro métodos adicionais aparecem com logos locais e permanecem desativados até cada provedor ter autenticação implementada.
- Cada logo de método usa Three.js em canvas transparente; o hover dispara uma volta no eixo Y sem mover o card.
- O e-mail mostra sugestões locais para `gmail.com`, `outlook.com`, `hotmail.com`, `yahoo.com.br` e `empresa.com.br`, além do estado de formato reconhecido.
- A senha mostra quatro níveis de força, barras semânticas e um anel de oito pontos que acompanha o progresso; o olho alterna `password`/`text` com feedback animado.
- O submit exibe somente o cachorro da marca durante o carregamento; o estado foi confirmado no DOM como `status` e a tentativa inválida retorna ao formulário com alerta.
- `prefers-reduced-motion` desativa as rotações e mantém os fallbacks visuais das logos.
- O shell autenticado recebeu a camada M3: drawer com `aria-current`, top app bar, busca tonal, cards em superfícies semânticas, controles com estados de foco e raios consistentes.
- A organização recebeu uma composição de brand studio: hero do tenant, hierarquia numerada, paleta com função, preview em moldura de navegador, status ao vivo e área de acessos separada.
- `npm run typecheck`: passou.
- `npm run build`: passou; 14 páginas estáticas geradas e APIs compiladas.
- Captura visual Chromium: concluída em `1920 × 1080`.
- Smoke responsivo: regras mobile revisadas e buildada; a captura headless mobile não foi usada como evidência visual porque o Chromium retornou um frame branco antes da pintura, sem uma referência mobile equivalente.
- O navegador interno do Codex bloqueou loopback com `ERR_BLOCKED_BY_CLIENT`; por isso a captura foi feita com Chromium local. Não foi observado erro da aplicação no carregamento; a única mensagem adicional foi uma tentativa externa do Chromium de instalar o web app do Gmail.

## Checklist

- [x] Referência e implementação comparadas no mesmo viewport.
- [x] Assets fornecidos reutilizados como arquivos.
- [x] Login continua funcional e sem criação pública de conta.
- [x] Feedback de preenchimento, força de senha e loading do login implementados.
- [x] White-label por organização preservado.
- [x] Responsividade mobile mantida ocultando a arte lateral em telas estreitas.

final result: passed (registro histórico do login; consultar a revisão abaixo para a etapa atual)

## Revisão de organização — 15/09/2026

- A composição numerada anterior foi substituída por bento: identidade e paleta na primeira linha, prévia do login e textos na segunda, equipe separada abaixo.
- A camada `src/app/(app)/workspace.css` é importada pelo layout autenticado. Sidebar com seleção tonal em cápsula e transições de forma; login público não recebe este novo stylesheet.
- Paletas Vinho, Ameixa e Oceano editam o rascunho. Nome, cores e textos dependem de salvar; uploads continuam sendo aplicados imediatamente, com esse comportamento informado na interface.
- Texto sobre a cor principal recebe preto ou branco por luminância; códigos curtos de cor são expandidos no seletor nativo. Foco e redução de movimento preservados.
- Inspeção visual no navegador interno: desktop e 390 × 844. No mobile, largura do documento de 375 px para viewport de 390 px, sem overflow horizontal.
- Limite dessa evidência: renderização estática do componente real com organização fictícia e sidebar simplificada. Não valida autenticação, persistência, upload, navegação mobile ou handlers interativos em produção.
- Compilação Next e etapa TypeScript passaram. A build completa falhou na coleta de dados porque `NEON_AUTH_BASE_URL` está ausente no ambiente local. Nenhum arquivo de ambiente ou credencial foi alterado.
- Detector mecânico de UI não reportou achados; isso não substitui testes funcionais.
- Pendente: testar paletas, salvar, recarregar e enviar imagem com sessão autenticada e ambiente configurado antes de considerar o fluxo validado ponta a ponta.
