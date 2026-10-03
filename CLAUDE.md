# workbox-app — instruções do frontend

> Complementa o [`CLAUDE.md` da raiz](../CLAUDE.md) (visão do monorepo, contrato, commits,
> infra) e as regras globais de `~/.claude/CLAUDE.md` (§8 frontend, §12 segurança de
> client). Aqui só o que é específico deste app. Detalhes de uso/funcionalidades:
> [`README.md`](README.md).
>
> Origem: consolida as regras ainda vivas do [`GEMINI.md`](GEMINI.md) (agente Antigravity,
> descontinuado em 2026-10-03). O `GEMINI.md` fica só como histórico, até o
> desenvolvedor decidir removê-lo — **não** o trate como instrução.

## Papel e autoria
- SPA do ecossistema Workbox: login/MFA/perfil, administração (usuários, papéis,
  auditoria), o módulo **Finanças** (`budget-service`) e o módulo **Forza**
  (`forza-telemetry-service`). Hub com 13 cards, só 3 ativos
  (Administração, Finanças, Forza); os demais são "Em breve".
- Desenvolvido pelo **Claude Code** (full-stack): mudança de contrato observável de um
  backend entra **na mesma tarefa** que o ajuste aqui (ver raiz).

## Stack e execução
- React 18, TypeScript 5.7 (`strict`, `noUnusedLocals/Parameters`), Vite 5, MUI v5 +
  Emotion, `react-hook-form` + `yup`, Axios, `react-router-dom` v6, `recharts` 3, `dayjs`
  + `@mui/x-date-pickers`, `qrcode.react`. Testes: Vitest + Testing Library; E2E:
  Puppeteer-core + Chrome headless.
- Porta dev **7053** (`npm run dev`); container nginx em 8080 → host 7053.
- Comandos: `npm install`/`npm ci`, `npm run dev`, `npm run lint`, `npm test`
  (`vitest run`), `npm run test:e2e` (`run-e2e.sh`: sobe `docker-compose.e2e.yml`
  efêmero, Vite na 5174 apontando pros containers — **não** polui o Postgres de dev),
  `npm run build` (`tsc -b && vite build`, saída `dist/`).
- Node: `ARG NODE_VERSION=22` no `Dockerfile` (fixado — não deixar flutuar). O shell do
  usuário carrega Node via nvm lazy; se `npm`/`node` falhar, consulte `~/.zshrc`.

## Estrutura (`src/`)
`components/` (`AppNavbar`, `UserAvatar`, `ConfirmDialog`, `IdleMonitor`) · `contexts/`
(`AuthContext`, `SnackbarContext`) · `hooks/` (`useAuth`, `useAuthenticatedAvatar`,
`useSnackbar`) · `interfaces/` (DTOs `I*`, `budget/index.ts`) · `pages/` (`Login`,
`ResetPassword`, `Dashboard`, `Perfil`, `Admin*`, `Financas` + `financas/{Receitas,
Despesas, Orcamentos, GerenciarTipos}`) · `routes/` (`routes.tsx`, `ProtectedRoute`,
`PublicRoute`; catch-all `*` → `/`) · `services/` (`api.ts`, `useAxiosWithAuth.ts`) ·
`utils/errors.ts` · `test/`.
Aliases (`@`, `@components`, `@pages`, `@services`, `@contexts`, `@hooks`, `@interfaces`,
`@routes`, `@utils`, ...) em `vite.config.ts` e `tsconfig.json` — vários (`@i18n`,
`@models`, `@themes`, `@config`, `@img`) apontam pra diretórios que **não existem**.
Páginas grandes (Perfil 921, AdminUsuarios 754, Despesas 703, Receitas 670 linhas):
ao mexer, prefira extrair componente/hook em vez de crescer o arquivo.

## Integração com backends
- Consome `workbox-api`, `budget-service` e `forza-telemetry-service`, e **apenas** a partir do
  `openapi/openapi.yaml` de cada um. Não inferir endpoint; contrato ausente/desatualizado
  → apontar, não assumir. Tipos hoje são escritos à mão em `interfaces/` (não há
  `openapi-typescript`); se for introduzir geração, é dependência nova (confirmar).
- **Roteamento** idêntico em dois lugares — mudar um exige mudar o outro:
  `vite.config.ts` (dev: `revenues|spendings|revenue-types|spending-types|budget-rules`
  → `VITE_BUDGET_API_URL` ou `:7052`; resto de `/api` → `VITE_API_URL` ou `:7051`) e
  `nginx.conf.template` (prod/container: mesmas rotas via `BUDGET_SERVICE_UPSTREAM`,
  `FORZA_SERVICE_UPSTREAM` e `WORKBOX_API_UPSTREAM`; nginx escolhe o prefixo mais
  específico). Forza: `/api/v1/sessions` e `/api/v1/live` → `forza-telemetry-service`
  (`VITE_FORZA_API_URL`, default `:7057`). Hoje **não** há rota pra `notes-service`
  (`/api/v1/documents`) — qualquer integração futura precisa dos dois arquivos e do
  upstream no `docker-compose.yml` da raiz.
- `api.ts`: `baseURL` vem de `VITE_PUBLIC_URL_API` (vazio = proxy), `withCredentials:
  true`. `useAxiosWithAuth` injeta `Authorization: Bearer` e, em `401`, renova via
  `POST /api/v1/auth/refresh` (corpo `{ "refreshToken": ... }`) e repete a chamada.
- Avatar protegido: blob autenticado via `GET /api/v1/user/{id}/avatar`
  (`useAuthenticatedAvatar`, com cache in-memory).
- **Roles**: authority pura (`ADMIN`, `USER`) em `/api/v1/role` e `/api/v1/user/**`; o
  prefixo `ROLE_` existe **só no claim `roles` do JWT** (o que `AuthContext` lê pra
  `isAdmin`, `includes('ROLE_ADMIN')`). Não criar/exibir/comparar authority com `ROLE_`
  nos CRUDs — já causou a role `ADMIN` virar `ROLE_ADMIN` no banco. Fixtures de teste que
  simulam o **JWT decodificado** usam `ROLE_*`; as que simulam resposta de CRUD, não.
- Só `VITE_PUBLIC_URL_API` é lida pelo código; as demais chaves de `.env`/
  `.env.development` são resíduo de scaffold (não documentar como comportamento real).

## Padrão do módulo Forza (referência pra módulos novos)
- Cliente HTTP em `services/forzaApi.ts`: funções **puras** sobre a instância Axios (a de
  `useAxiosWithAuth`), com `AbortSignal`; erro esperado (404 do `/live/snapshot`) vira
  retorno `null`, não exceção. Tipos em `interfaces/forza`, formatação/conversões em
  `utils/forza.ts`.
- Polling em hook dedicado (`hooks/useLiveSnapshot.ts`): sem requisições empilhadas, pausa
  com a aba oculta, aborta ao desmontar. Dado secundário (amostras da telemetria) só é
  buscado ao abrir a aba. Séries grandes passam por `decimate` antes do recharts.
- **Todas** as rotas autenticadas usam `lazy` do React Router (`routes.tsx`; só Login/ResetPassword
  são estáticas) — o recharts fica fora do bundle principal. Páginas finas, componentes
  de apresentação em `components/forza/`.
- Temperatura de pneu chega em °F do jogo: converter pra °C só na exibição.

## Tela de Metas e Orçamentos (referência de carregamento de dados)
- `services/budgetApi.ts#loadOrcamentos` carrega tudo em paralelo com `AbortSignal`; totais
  por tipo (anual e do mês) vêm agregados do servidor (`by-type?year&month`) — **nunca**
  baixar listas de lançamentos pra somar no cliente. O gráfico anual vem de **uma** chamada
  (`budget-rules/monthly-series?year`); se só ela falhar, o gráfico mostra zeros e a tela segue.
- Erro de carregamento sempre avisa por snackbar; cancelamento (`axios.isCancel`) não.
- `formatCurrency` único em `utils/format.ts`; cards de hub via `components/SectionCard`.

## Regras de código e armadilhas
- **`catch (e: unknown)` + axios**: nunca acessar `e.response`/`e.message` direto — use
  `getErrorMessage(e)` de `src/utils/errors.ts`. Trocar `any` por tipo que não bate com o
  shape real é pior que `any` (quebra o build). Já derrubou o build de produção
  (incidente 2026-09-13).
- **Props de libs externas** tipadas como opcionais (ex.: `name` do `label` do `<Pie>` do
  recharts é `string | undefined`) não podem ser estreitadas pra obrigatórias: a
  assinatura tem que ser compatível com o tipo da lib.
- **Antes de commitar mudança de tipagem/lint**: rodar `npm run build` (`tsc -b`) e
  confirmar que passa — ESLint e `tsc` podem discordar; o editor não basta.
- **Nunca commitar scripts de scratch** (`.cjs`, `.py`, `.js` de patch/fix de uso único):
  apagar antes de cada commit; `git status` sem "não monitorados" desse tipo.
- **Estado**: local por padrão; contextos só pra Auth e Snackbar. Server state hoje é
  `useState`/`useEffect` com Axios (sem TanStack Query) — não introduzir store global
  nem cache lib sem justificar (dependência nova exige confirmação).
- **Dinheiro**: formatar em BRL (`Intl`/`toLocaleString('pt-BR', ...)`); datas com `dayjs`
  (competência = `referenceDate` no backend). Lançamentos em lote são componentizados por
  performance — manter.
- **Tema/UI**: MUI + tokens do tema; sem cores/espaçamentos mágicos; mobile-first; foco
  visível e navegação por teclado em elementos custom; contraste AA.
- **Segurança** (apontar sempre que tocar):
  - O **refresh token fica em `localStorage`** (`AuthContext`, chave
    `REFRESH_TOKEN_STORAGE_KEY`) — exposto a XSS (CWE-922); o ideal é cookie
    `HttpOnly`+`Secure`+`SameSite` emitido pelo backend. Débito conhecido, mudança exige
    contrato novo no `workbox-api`. O access token fica só em memória (`useState`).
  - "Lembrar de mim" guarda só o e-mail em `localStorage`.
  - Sem `dangerouslySetInnerHTML`/`innerHTML`; manter assim.
  - Auto-logout por inatividade de 15 min (`IdleMonitor`).

## Testes (test-first)
- Vitest + Testing Library em `src/test/` (`*.test.tsx`, `setupTests.ts`): comportamento,
  não implementação; cobrir caminho feliz, erro, loading e acessibilidade. Mocks de HTTP
  só na fronteira (Axios), a partir do contrato.
- E2E em `src/test/browser-e2e.mjs` (Puppeteer + Chrome headless) via `npm run test:e2e`;
  precisa de Docker e do Chrome instalado.
- Contas QA fixas (uso exclusivo do Claude, nunca em demo): `qa.admin@workbox.local` /
  `QaAdmin@123` (ADMIN+USER) e `qa.user@workbox.local` / `QaUser@123` (USER); recriação em
  [`workbox-api/README.md`](../workbox-api/README.md#contas-de-teste-qa). As seed
  (`admin@`/`user@workbox.local`) não têm senha estável.
- **Validação visual**: após alterar UI, validar render/interação/console no browser
  (skills `webapp-testing` / Chrome) e relatar em 1 linha o que foi verificado.
- CI (`.gitlab-ci.yml`): `lint-test-build` (node:22: `npm ci`, `npm run lint`, `npm test`,
  `npm run build`) em **toda** branch/MR, e `sonarcloud-check` só em MR e `main`. O E2E
  (`test:e2e`, Docker + Chrome) não roda no CI. Lint está zerado de erros — mantenha assim.

## Manutenção do README
Mudou comportamento observável (rota/página, componente relevante, campo de formulário,
env var, dependência, fluxo de auth/UX)? Atualize o `README.md` **na mesma tarefa**:
árvore de estrutura, tabela de módulos, variáveis de ambiente, testes/CI. Antes de
concluir, confira se algo *existente* do README ficou desatualizado (arquivo movido, env
var, endpoint). Divergência README × código é tarefa incompleta.

## Commits
pt-BR, Conventional Commits (`feat(financas): adiciona ...`), conforme o
[CLAUDE.md da raiz](../CLAUDE.md#convenção-de-mensagens-de-commit). Trabalhar em
`develop`; push só com confirmação.
