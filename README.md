# workbox-app

Frontend do [monorepo `workbox`](../README.md) — consome a API em
[`workbox-api`](../workbox-api/README.md).

> Desenvolvimento deste submódulo é de responsabilidade do agente Antigravity (ver
> [AGENTS.md](../AGENTS.md) na raiz do monorepo).

Também espelhado no [GitHub](https://github.com/juniiorliimatt/workbox-app) — todo push
pro GitLab é replicado automaticamente via git hook. Ver
[README raiz](../README.md#espelho-no-github--git-hooks).

## Stack

| Camada | Tecnologia |
|---|---|
| Linguagem | TypeScript |
| Framework | React 18 |
| Build | Vite 5 |
| UI | MUI (Material UI) + Emotion |
| Formulários | react-hook-form + yup |
| HTTP | axios |
| Roteamento | react-router-dom |
| i18n | react-i18next |

## Estrutura

```
src/
├── assets/       Imagens, ícones estáticos
├── contexts/      Contextos React (ex.: AuthContext)
├── interfaces/    Tipos/contratos TypeScript
├── pages/         Telas
├── routes/        Definição de rotas (routes.tsx)
└── services/      Clientes HTTP (ex.: useAxiosWithAuth)
```

Aliases de import configurados em `vite.config.js` (`@`, `@components`, `@pages`,
`@services`, `@contexts`, `@hooks`, `@i18n`, `@interfaces`, `@models`, `@routes`,
`@themes`, `@utils`, `@img`, `@config`, `@assets`).

## Rodando localmente

```bash
npm install
npm run dev       # http://localhost:5173
npm run lint
npm run build      # bundle em dist/ (padrão do Vite)
npm run preview
```

Variáveis de ambiente (`.env.development`): `VITE_PUBLIC_URL_API` (origem da API),
`VITE_PUBLIC_URL_API_ORIGIN`, `VITE_PUBLIC_SSO_LOGIN_URL` /
`VITE_PUBLIC_SSO_LOGOUT_URL`, `VITE_INITIAL_PATH`, `VITE_BASE_URL`.

Também roda containerizado, isolado dos backends (`Dockerfile` — build `dist/` +
nginx servindo standalone, com proxy reverso de `/api/*` pro `workbox-api` dentro da
rede do `docker-compose.yml` da raiz); ver [README raiz](../README.md#rodando-tudo-em-containers).

## Integração com o backend

Decisão em 2026-08-29: existia um modo em que `npm run build` escrevia direto em
`workbox-api/src/main/resources/static/` e o backend servia o `index.html` na raiz
(`FrontendController`) — API e SPA no mesmo JAR. Descontinuado; `workbox-api` não serve
mais frontend nenhum, o build fica em `dist/` e sobe isolado (nativo via `npm run
preview`, ou containerizado via `Dockerfile`).

A API consumida é `workbox-api`. O contrato REST — endpoints, schemas, o que pode ser
assumido — está versionado em
[`workbox-api/openapi/openapi.yaml`](../workbox-api/openapi/openapi.yaml) e documentado
em [`workbox-api/README.md`](../workbox-api/README.md#contrato-de-api-openapi). Não
assuma comportamento de endpoint que não esteja descrito nesse arquivo; se precisar de
algo que não existe no contrato, é uma mudança do lado backend, não algo pra
mockar/assumir no frontend.
