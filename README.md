# workbox-app

Frontend do [monorepo `workbox`](../README.md) — consome a API em
[`workbox-api`](../workbox-api/README.md).

> Desenvolvimento deste submódulo é de responsabilidade do agente Antigravity (ver
> [AGENTS.md](../AGENTS.md) na raiz do monorepo).

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
npm run build      # gera o bundle direto em ../workbox-api/src/main/resources/static
npm run preview
```

Variáveis de ambiente (`.env.development`): `VITE_PUBLIC_URL_API` (origem da API),
`VITE_PUBLIC_URL_API_ORIGIN`, `VITE_PUBLIC_SSO_LOGIN_URL` /
`VITE_PUBLIC_SSO_LOGOUT_URL`, `VITE_INITIAL_PATH`, `VITE_BASE_URL`.

## Integração com o backend

O `npm run build` escreve o bundle diretamente em
`workbox-api/src/main/resources/static/` (ver `vite.config.js`, `outDir`) — API e SPA
sobem juntas num único JAR (`FrontendController` no backend serve o `index.html` na
raiz).

A API consumida é `workbox-api`. O contrato REST — endpoints, schemas, o que pode ser
assumido — está versionado em
[`workbox-api/openapi/openapi.yaml`](../workbox-api/openapi/openapi.yaml) e documentado
em [`workbox-api/README.md`](../workbox-api/README.md#contrato-de-api-openapi). Não
assuma comportamento de endpoint que não esteja descrito nesse arquivo; se precisar de
algo que não existe no contrato, é uma mudança do lado backend, não algo pra
mockar/assumir no frontend.
